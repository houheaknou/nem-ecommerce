import "server-only";
import { z } from "zod";
import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { resolvePrice, type PriceSource } from "@/features/pricing/domain/pricing";

export const cartLineSchema = z.object({
  variantId: z.uuid(),
  quantity: z.number().int().min(1).max(10_000),
});
export const cartSchema = z.array(cartLineSchema).max(50);
export type CartLineInput = z.infer<typeof cartLineSchema>;

export interface QuoteLine {
  variantId: string;
  sku: string;
  nameKm: string;
  nameEn: string;
  productNameKm: string;
  productNameEn: string;
  quantity: number;
  listUnitPrice: string;
  unitPrice: string;
  source: PriceSource;
  lineTotal: string;
  weightGrams: number; // incl. packaging, for the whole line
}

/**
 * Prices a cart entirely on the server for a given customer (or guest).
 * Used by the cart page preview and — inside a transaction — by checkout.
 */
export async function quoteCart(lines: CartLineInput[], customerId: string | null, now = new Date()) {
  const merged = new Map<string, number>();
  for (const l of cartSchema.parse(lines)) merged.set(l.variantId, (merged.get(l.variantId) ?? 0) + l.quantity);

  const customer = customerId
    ? await db.customer.findUnique({
        where: { id: customerId },
        include: { priceLists: { include: { priceList: { include: { items: true } } } } },
      })
    : null;

  const variants = await db.productVariant.findMany({
    where: { id: { in: [...merged.keys()] }, isActive: true, product: { isActive: true, deletedAt: null } },
    include: {
      product: true,
      promotions: { where: { isActive: true, validFrom: { lte: now }, validTo: { gte: now } } },
      priceListItems: { where: { priceList: { isWholesaleDefault: true, isActive: true } }, include: { priceList: true } },
    },
  });
  const globalPromos = await db.promotion.findMany({
    where: { variantId: null, isActive: true, validFrom: { lte: now }, validTo: { gte: now } },
  });

  const out: QuoteLine[] = [];
  const missing: string[] = [];
  for (const [variantId, quantity] of merged) {
    const v = variants.find((x) => x.id === variantId);
    if (!v) {
      missing.push(variantId);
      continue;
    }
    const wl = v.priceListItems[0]?.priceList;
    const r = resolvePrice({
      retailPrice: v.retailPrice,
      quantity,
      now,
      currency: v.currency,
      customer: customer
        ? { type: customer.type, wholesaleApproved: customer.wholesaleStatus === "APPROVED" }
        : null,
      wholesaleList: wl
        ? {
            validFrom: wl.validFrom,
            validTo: wl.validTo,
            isActive: wl.isActive,
            tiers: v.priceListItems.map((i) => ({ minQty: i.minQty, maxQty: i.maxQty, unitPrice: i.unitPrice })),
          }
        : null,
      customerLists: (customer?.priceLists ?? []).map(({ priceList: pl }) => ({
        validFrom: pl.validFrom,
        validTo: pl.validTo,
        isActive: pl.isActive,
        tiers: pl.items
          .filter((i) => i.variantId === variantId)
          .map((i) => ({ minQty: i.minQty, maxQty: i.maxQty, unitPrice: i.unitPrice })),
      })),
      promotions: [...v.promotions, ...globalPromos].map((p) => ({
        percentOff: p.percentOff,
        amountOff: p.amountOff,
        appliesTo: p.appliesTo,
        validFrom: p.validFrom,
        validTo: p.validTo,
      })),
    });
    out.push({
      variantId,
      sku: v.sku,
      nameKm: v.nameKm,
      nameEn: v.nameEn,
      productNameKm: v.product.nameKm,
      productNameEn: v.product.nameEn,
      quantity,
      listUnitPrice: r.listUnitPrice.toString(),
      unitPrice: r.unitPrice.toString(),
      source: r.source,
      lineTotal: r.lineTotal.toString(),
      weightGrams: quantity * (v.weightGrams + v.packagingGrams),
    });
  }

  const subtotal = out.reduce((s, l) => s.plus(l.lineTotal), new Decimal(0));
  const listTotal = out.reduce((s, l) => s.plus(new Decimal(l.listUnitPrice).mul(l.quantity)), new Decimal(0));
  return {
    lines: out,
    missing,
    subtotal: subtotal.toString(),
    discountTotal: Decimal.max(listTotal.minus(subtotal), 0).toString(),
    totalQuantity: out.reduce((n, l) => n + l.quantity, 0),
    totalWeightGrams: out.reduce((g, l) => g + l.weightGrams, 0),
  };
}
