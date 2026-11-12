"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { signIn } from "@/auth";
import { db, nextCode } from "@/lib/db";
import { audit } from "@/lib/audit";
import { run, UserError } from "@/lib/action";
import { normalizePhone } from "@/lib/phone";
import { rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/features/auth/guard";
import { addressSchema, wholesaleApplicationSchema } from "@/features/customers/schemas";
import { removeAddress, upsertAddress } from "@/features/customers/service";
import { profileSchema, registerSchema } from "./schemas";

/**
 * Self-registration as a RETAIL customer. If staff already created a customer
 * record with this phone (e.g. a Facebook order) and it has no login yet, the
 * new account is linked to it instead of creating a duplicate.
 */
export async function registerAction(input: unknown) {
  const ip = (await headers()).get("x-real-ip") ?? "local";
  if (!rateLimit(`register:${ip}`, 5, 60 * 60_000)) return { ok: false as const, error: "RATE_LIMITED" };
  const r = await run(async () => {
    const { fullName, phone, email, password } = registerSchema.parse(input);
    const phoneNormalized = normalizePhone(phone);
    const emailLower = email.toLowerCase();

    await db.$transaction(async (tx) => {
      if (await tx.user.findUnique({ where: { email: emailLower } })) throw new UserError("EMAIL_TAKEN");
      const role = await tx.role.findUniqueOrThrow({ where: { code: "RETAIL_CUSTOMER" } });
      const user = await tx.user.create({
        data: { email: emailLower, name: fullName, passwordHash: await bcrypt.hash(password, 10), roles: { create: { roleId: role.id } } },
      });
      const existing = await tx.customer.findFirst({ where: { phoneNormalized, deletedAt: null }, orderBy: { createdAt: "asc" } });
      if (existing?.userId) throw new UserError("PHONE_TAKEN");
      const customer = existing
        ? await tx.customer.update({ where: { id: existing.id }, data: { userId: user.id, email: existing.email ?? emailLower } })
        : await tx.customer.create({
            data: {
              code: await nextCode(tx, "CUSTOMER", "CUS"),
              userId: user.id,
              fullName,
              phone,
              phoneNormalized,
              email: emailLower,
              acquisitionSource: "WEBSITE",
            },
          });
      await audit(tx, { userId: user.id, action: existing ? "account.register.link" : "account.register", entityType: "customer", entityId: customer.id });
    });
    return { email: emailLower, password };
  });
  if (!r.ok) return r;
  // Sign in right away; signIn throws NEXT_REDIRECT which must propagate.
  await signIn("credentials", { identifier: r.data.email, password: r.data.password, redirectTo: "/account" });
  return { ok: true as const, data: undefined };
}

async function myCustomer() {
  const user = await requireUser();
  if (!user.customer) throw new UserError("NOT_FOUND");
  return { user, customerId: user.customer.id };
}

export async function updateProfile(input: unknown) {
  return run(async () => {
    const { user, customerId } = await myCustomer();
    const { fullName, phone } = profileSchema.parse(input);
    const phoneNormalized = normalizePhone(phone);
    await db.$transaction(async (tx) => {
      const clash = await tx.customer.findFirst({ where: { phoneNormalized, id: { not: customerId }, userId: { not: null } } });
      if (clash) throw new UserError("PHONE_TAKEN");
      await tx.customer.update({ where: { id: customerId }, data: { fullName, phone, phoneNormalized } });
      await tx.user.update({ where: { id: user.id }, data: { name: fullName } });
      await audit(tx, { userId: user.id, action: "account.profile", entityType: "customer", entityId: customerId });
    });
    revalidatePath("/account");
  });
}

export async function saveMyAddress(input: unknown) {
  return run(async () => {
    const { user, customerId } = await myCustomer();
    const data = addressSchema.parse(input);
    await db.$transaction(async (tx) => {
      const row = await upsertAddress(tx, customerId, data);
      await audit(tx, { userId: user.id, action: "account.address.save", entityType: "customer", entityId: customerId, after: row });
    });
    revalidatePath("/account");
  });
}

export async function deleteMyAddress(addressId: string) {
  return run(async () => {
    const { user, customerId } = await myCustomer();
    await db.$transaction(async (tx) => {
      const before = await removeAddress(tx, customerId, addressId);
      await audit(tx, { userId: user.id, action: "account.address.delete", entityType: "customer", entityId: customerId, before });
    });
    revalidatePath("/account");
  });
}

/** Customer applies for wholesale; an admin approves in /admin/wholesale. */
export async function applyWholesale(input: unknown) {
  return run(async () => {
    const { user, customerId } = await myCustomer();
    const data = wholesaleApplicationSchema.parse(input);
    await db.$transaction(async (tx) => {
      const c = await tx.customer.findUniqueOrThrow({ where: { id: customerId } });
      if (c.wholesaleStatus === "APPROVED") throw new UserError("ALREADY_REVIEWED");
      if (await tx.wholesaleApproval.findFirst({ where: { customerId, status: "PENDING" } })) throw new UserError("ALREADY_PENDING");
      const app = await tx.wholesaleApproval.create({
        data: { customerId, businessName: data.businessName, businessType: data.businessType || null, expectedMonthlyPacks: data.expectedMonthlyPacks },
      });
      await tx.customer.update({ where: { id: customerId }, data: { wholesaleStatus: "PENDING", businessName: data.businessName } });
      await audit(tx, { userId: user.id, action: "wholesale.apply", entityType: "customer", entityId: customerId, after: app });
    });
    revalidatePath("/account");
    revalidatePath("/wholesale");
  });
}
