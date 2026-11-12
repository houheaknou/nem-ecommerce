"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { run, UserError } from "@/lib/action";
import { requirePermission } from "@/features/auth/guard";
import { validateTiers } from "./domain/pricing";
import { parseDay, priceListSchema, promotionSchema, variantTiersSchema } from "./schemas";

function revalidatePricing() {
  revalidatePath("/admin/pricing", "layout");
  revalidatePath("/", "layout");
}

async function defaultWholesaleListId() {
  const existing = await db.priceList.findFirst({ where: { isWholesaleDefault: true }, orderBy: { createdAt: "asc" } });
  if (existing) return existing.id;
  const created = await db.priceList.create({ data: { name: "Wholesale (standard)", isWholesaleDefault: true } });
  return created.id;
}

/** Replaces all tiers of one variant in one price list. Rejects overlaps. */
export async function saveVariantTiers(input: unknown) {
  return run(async () => {
    const user = await requirePermission("price.edit");
    const { priceListId, variantId, tiers } = variantTiersSchema.parse(input);
    validateTiers(tiers); // throws PricingError -> shown to the user
    const listId = priceListId ?? (await defaultWholesaleListId());

    await db.$transaction(async (tx) => {
      const before = await tx.priceListItem.findMany({ where: { priceListId: listId, variantId } });
      await tx.priceListItem.deleteMany({ where: { priceListId: listId, variantId } });
      if (tiers.length) {
        await tx.priceListItem.createMany({
          data: tiers.map((t) => ({ priceListId: listId, variantId, minQty: t.minQty, maxQty: t.maxQty, unitPrice: t.unitPrice })),
        });
      }
      await audit(tx, { userId: user.id, action: "price.tiers", entityType: "price_list", entityId: listId, before, after: { variantId, tiers } });
    });
    revalidatePricing();
  });
}

export async function savePriceList(input: unknown) {
  return run(async () => {
    const user = await requirePermission("price.edit");
    const { id, name, validFrom, validTo, isActive } = priceListSchema.parse(input);
    const data = { name, isActive, validFrom: parseDay(validFrom), validTo: parseDay(validTo, true) };
    const row = await db.$transaction(async (tx) => {
      const before = id ? await tx.priceList.findUnique({ where: { id } }) : null;
      if (before?.isWholesaleDefault) throw new UserError("FORBIDDEN");
      const saved = id ? await tx.priceList.update({ where: { id }, data }) : await tx.priceList.create({ data });
      await audit(tx, { userId: user.id, action: id ? "price_list.update" : "price_list.create", entityType: "price_list", entityId: saved.id, before, after: saved });
      return saved;
    });
    revalidatePricing();
    return { id: row.id };
  });
}

export async function deletePriceList(id: string) {
  return run(async () => {
    const user = await requirePermission("price.edit");
    await db.$transaction(async (tx) => {
      const before = await tx.priceList.findUniqueOrThrow({ where: { id }, include: { items: true, customers: true } });
      if (before.isWholesaleDefault) throw new UserError("FORBIDDEN");
      await tx.priceList.delete({ where: { id } }); // items + assignments cascade; orders keep snapshot prices
      await audit(tx, { userId: user.id, action: "price_list.delete", entityType: "price_list", entityId: id, before });
    });
    revalidatePricing();
  });
}

export async function setListCustomer(priceListId: string, customerId: string, assigned: boolean) {
  return run(async () => {
    const user = await requirePermission("price.edit");
    z.uuid().parse(priceListId);
    z.uuid().parse(customerId);
    await db.$transaction(async (tx) => {
      if (assigned) {
        await tx.customerPriceList.upsert({
          where: { customerId_priceListId: { customerId, priceListId } },
          update: {},
          create: { customerId, priceListId },
        });
      } else {
        await tx.customerPriceList.deleteMany({ where: { customerId, priceListId } });
      }
      await audit(tx, { userId: user.id, action: assigned ? "price_list.assign" : "price_list.unassign", entityType: "price_list", entityId: priceListId, after: { customerId } });
    });
    revalidatePricing();
    revalidatePath(`/admin/customers/${customerId}`);
  });
}

export async function savePromotion(input: unknown) {
  return run(async () => {
    const user = await requirePermission("price.edit");
    const { id, validFrom, validTo, ...rest } = promotionSchema.parse(input);
    const data = { ...rest, validFrom: parseDay(validFrom)!, validTo: parseDay(validTo, true)! };
    await db.$transaction(async (tx) => {
      const before = id ? await tx.promotion.findUnique({ where: { id } }) : null;
      const saved = id ? await tx.promotion.update({ where: { id }, data }) : await tx.promotion.create({ data });
      await audit(tx, { userId: user.id, action: id ? "promotion.update" : "promotion.create", entityType: "promotion", entityId: saved.id, before, after: saved });
    });
    revalidatePricing();
  });
}

export async function deletePromotion(id: string) {
  return run(async () => {
    const user = await requirePermission("price.edit");
    await db.$transaction(async (tx) => {
      const before = await tx.promotion.delete({ where: { id } });
      await audit(tx, { userId: user.id, action: "promotion.delete", entityType: "promotion", entityId: id, before });
    });
    revalidatePricing();
  });
}
