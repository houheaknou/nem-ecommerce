import "server-only";
import { db } from "@/lib/db";

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export async function listPricingVariants() {
  const variants = await db.productVariant.findMany({
    where: { product: { deletedAt: null } },
    orderBy: [{ product: { createdAt: "asc" } }, { sortOrder: "asc" }],
    select: {
      id: true,
      sku: true,
      nameKm: true,
      nameEn: true,
      retailPrice: true,
      isActive: true,
      product: { select: { nameKm: true, nameEn: true } },
    },
  });
  return variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    labelKm: `${v.product.nameKm} · ${v.nameKm}`,
    labelEn: `${v.product.nameEn} · ${v.nameEn}`,
    retailPrice: Number(v.retailPrice),
    isActive: v.isActive,
  }));
}
export type PricingVariant = Awaited<ReturnType<typeof listPricingVariants>>[number];

export async function getTiersByVariant(priceListId: string | null) {
  const items = await db.priceListItem.findMany({
    where: priceListId ? { priceListId } : { priceList: { isWholesaleDefault: true } },
    orderBy: { minQty: "asc" },
  });
  const map: Record<string, { minQty: number; maxQty: number | null; unitPrice: number }[]> = {};
  for (const i of items) (map[i.variantId] ??= []).push({ minQty: i.minQty, maxQty: i.maxQty, unitPrice: Number(i.unitPrice) });
  return map;
}

export async function listCustomerPriceLists() {
  const lists = await db.priceList.findMany({
    where: { isWholesaleDefault: false },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { customers: true, items: true } } },
  });
  return lists.map((l) => ({
    id: l.id,
    name: l.name,
    isActive: l.isActive,
    validFrom: day(l.validFrom),
    validTo: day(l.validTo),
    customerCount: l._count.customers,
    itemCount: l._count.items,
  }));
}

export async function getPriceList(id: string) {
  const l = await db.priceList.findUnique({
    where: { id },
    include: { customers: { include: { customer: { select: { id: true, code: true, fullName: true, businessName: true } } } } },
  });
  if (!l || l.isWholesaleDefault) return null;
  return {
    id: l.id,
    name: l.name,
    isActive: l.isActive,
    validFrom: day(l.validFrom),
    validTo: day(l.validTo),
    customers: l.customers.map((c) => c.customer),
  };
}

export async function listPromotions() {
  const rows = await db.promotion.findMany({
    orderBy: { validFrom: "desc" },
    include: { variant: { select: { sku: true } } },
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    variantId: p.variantId,
    sku: p.variant?.sku ?? null,
    percentOff: p.percentOff === null ? null : Number(p.percentOff),
    amountOff: p.amountOff === null ? null : Number(p.amountOff),
    appliesTo: p.appliesTo,
    validFrom: day(p.validFrom),
    validTo: day(p.validTo),
    isActive: p.isActive,
  }));
}
export type PromotionRow = Awaited<ReturnType<typeof listPromotions>>[number];
