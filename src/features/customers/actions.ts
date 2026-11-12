"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, nextCode } from "@/lib/db";
import { audit } from "@/lib/audit";
import { run, UserError } from "@/lib/action";
import { normalizePhone, phoneSearchFragment } from "@/lib/phone";
import { AuthError, requirePermission, requireStaff } from "@/features/auth/guard";
import { hasPermission } from "@/features/auth/permissions";
import { addressSchema, customerSchema } from "./schemas";
import { removeAddress, upsertAddress } from "./service";

/** Another customer with the same normalised phone, if any. */
export async function findDuplicatePhone(phone: string, excludeId?: string) {
  return run(async () => {
    await requirePermission("customer.view");
    const normalized = normalizePhone(phone);
    if (normalized.length < 9) return null;
    const dup = await db.customer.findFirst({
      where: { phoneNormalized: normalized, deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true, code: true, fullName: true },
    });
    return dup;
  });
}

/** Lightweight lookup for pickers (price lists, manual orders). */
export async function searchCustomers(q: string) {
  return run(async () => {
    const user = await requireStaff();
    if (!["customer.view", "price.edit", "order.manage"].some((p) => hasPermission(user.roleCodes, p as never))) {
      throw new AuthError("FORBIDDEN");
    }
    const term = z.string().trim().max(80).parse(q);
    if (term.length < 2) return [];
    const digits = term.replace(/\D/g, "");
    return db.customer.findMany({
      where: {
        deletedAt: null,
        OR: [
          { fullName: { contains: term, mode: "insensitive" } },
          { businessName: { contains: term, mode: "insensitive" } },
          { code: { contains: term, mode: "insensitive" } },
          ...(digits.length >= 3 ? [{ phoneNormalized: { contains: phoneSearchFragment(term) } }] : []),
        ],
      },
      take: 10,
      orderBy: { fullName: "asc" },
      select: { id: true, code: true, fullName: true, businessName: true, type: true },
    });
  });
}

export async function saveCustomer(input: unknown) {
  return run(async () => {
    const user = await requirePermission("customer.edit");
    const { id, allowDuplicatePhone, ...data } = customerSchema.parse(input);
    const phoneNormalized = normalizePhone(data.phone);

    if (!allowDuplicatePhone) {
      const dup = await db.customer.findFirst({
        where: { phoneNormalized, deletedAt: null, ...(id ? { id: { not: id } } : {}) },
        select: { id: true },
      });
      if (dup) throw new UserError(`DUPLICATE_PHONE:${dup.id}`);
    }

    const clean = {
      ...data,
      email: data.email || null,
      businessName: data.businessName || null,
      contactPerson: data.contactPerson || null,
      notes: data.notes || null,
      phoneNormalized,
    };

    const saved = await db.$transaction(async (tx) => {
      const before = id ? await tx.customer.findUnique({ where: { id } }) : null;
      if (id && !before) throw new UserError("NOT_FOUND");

      // Making someone a wholesale customer is an approval decision.
      const becomesWholesale = clean.type === "WHOLESALE" && before?.type !== "WHOLESALE";
      if (becomesWholesale && !hasPermission(user.roleCodes, "wholesale.approve")) throw new AuthError("FORBIDDEN");
      const wholesaleStatus =
        clean.type === "WHOLESALE" ? "APPROVED" : before?.wholesaleStatus === "APPROVED" ? "NONE" : (before?.wholesaleStatus ?? "NONE");

      const row = id
        ? await tx.customer.update({ where: { id }, data: { ...clean, wholesaleStatus } })
        : await tx.customer.create({ data: { ...clean, wholesaleStatus, code: await nextCode(tx, "CUSTOMER", "CUS") } });

      await audit(tx, { userId: user.id, action: id ? "customer.update" : "customer.create", entityType: "customer", entityId: row.id, before, after: row });
      return row;
    });
    revalidatePath("/admin/customers", "layout");
    return { id: saved.id };
  });
}

export async function saveCustomerAddress(customerId: string, input: unknown) {
  return run(async () => {
    const user = await requirePermission("customer.edit");
    z.uuid().parse(customerId);
    const data = addressSchema.parse(input);
    await db.$transaction(async (tx) => {
      const row = await upsertAddress(tx, customerId, data);
      await audit(tx, { userId: user.id, action: "customer.address.save", entityType: "customer", entityId: customerId, after: row });
    });
    revalidatePath(`/admin/customers/${customerId}`);
  });
}

export async function deleteCustomerAddress(customerId: string, addressId: string) {
  return run(async () => {
    const user = await requirePermission("customer.edit");
    await db.$transaction(async (tx) => {
      const before = await removeAddress(tx, customerId, addressId);
      await audit(tx, { userId: user.id, action: "customer.address.delete", entityType: "customer", entityId: customerId, before });
    });
    revalidatePath(`/admin/customers/${customerId}`);
  });
}

/** Approve or reject a wholesale application. */
export async function reviewWholesale(approvalId: string, approve: boolean, note: string) {
  return run(async () => {
    const user = await requirePermission("wholesale.approve");
    z.uuid().parse(approvalId);
    const reviewNote = z.string().trim().max(500).parse(note) || null;

    await db.$transaction(async (tx) => {
      const app = await tx.wholesaleApproval.findUnique({ where: { id: approvalId }, include: { customer: true } });
      if (!app) throw new UserError("NOT_FOUND");
      if (app.status !== "PENDING") throw new UserError("ALREADY_REVIEWED");

      const status = approve ? "APPROVED" : "REJECTED";
      await tx.wholesaleApproval.update({
        where: { id: approvalId },
        data: { status, reviewedById: user.id, reviewNote, reviewedAt: new Date() },
      });
      await tx.customer.update({
        where: { id: app.customerId },
        data: approve
          ? { type: "WHOLESALE", wholesaleStatus: "APPROVED", businessName: app.customer.businessName ?? app.businessName }
          : { wholesaleStatus: "REJECTED" },
      });
      if (approve && app.customer.userId) {
        const role = await tx.role.findUnique({ where: { code: "WHOLESALE_CUSTOMER" } });
        if (role) {
          await tx.userRole.upsert({
            where: { userId_roleId: { userId: app.customer.userId, roleId: role.id } },
            update: {},
            create: { userId: app.customer.userId, roleId: role.id },
          });
        }
      }
      await audit(tx, { userId: user.id, action: `wholesale.${status.toLowerCase()}`, entityType: "customer", entityId: app.customerId, after: { approvalId, reviewNote } });
    });
    revalidatePath("/admin/wholesale");
    revalidatePath("/admin/customers", "layout");
  });
}
