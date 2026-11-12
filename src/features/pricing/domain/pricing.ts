import Decimal from "decimal.js";
import { D, roundMoney, type MoneyInput } from "@/lib/money";

/**
 * Server-side price resolution. The client never sends a price; it sends
 * (variantId, qty) and this function decides what the customer pays.
 *
 * Priority (first eligible wins for the base price):
 *   1. Customer-specific negotiated tier (customer must be linked to the list)
 *   2. Public wholesale tier (customer must be an APPROVED wholesale customer)
 *   3. Retail price
 * Then a valid promotion is applied on top of a RETAIL or WHOLESALE_TIER base.
 * Negotiated customer prices are final and are not stacked with promotions.
 */

export type PriceSource = "RETAIL" | "WHOLESALE_TIER" | "CUSTOMER" | "PROMO";

export interface PriceTier {
  minQty: number;
  maxQty: number | null; // inclusive; null = unbounded
  unitPrice: MoneyInput;
}

export interface TierList {
  tiers: PriceTier[];
  validFrom?: Date | null;
  validTo?: Date | null;
  isActive?: boolean;
}

export interface Promotion {
  percentOff?: MoneyInput | null;
  amountOff?: MoneyInput | null;
  appliesTo?: "RETAIL" | "WHOLESALE" | null;
  validFrom: Date;
  validTo: Date;
  isActive?: boolean;
}

export interface PricingCustomer {
  type: "RETAIL" | "WHOLESALE";
  wholesaleApproved: boolean;
}

export interface PriceInput {
  retailPrice: MoneyInput;
  quantity: number;
  customer: PricingCustomer | null; // null = guest => retail
  customerLists?: TierList[];
  wholesaleList?: TierList | null;
  promotions?: Promotion[];
  now?: Date;
  currency?: string;
}

export interface PriceResult {
  listUnitPrice: Decimal; // retail reference
  baseUnitPrice: Decimal; // after tier/customer rules, before promo
  unitPrice: Decimal; // final per-unit selling price
  source: PriceSource;
  discountPerUnit: Decimal; // listUnitPrice - unitPrice (>= 0)
  lineTotal: Decimal;
}

export class PricingError extends Error {}

function isListValid(list: TierList, now: Date): boolean {
  if (list.isActive === false) return false;
  if (list.validFrom && now < list.validFrom) return false;
  if (list.validTo && now > list.validTo) return false;
  return true;
}

export function findTier(tiers: PriceTier[], qty: number): PriceTier | undefined {
  return tiers.find((t) => qty >= t.minQty && (t.maxQty === null || qty <= t.maxQty));
}

/** Throws if tiers overlap or are malformed. Call before saving a price list. */
export function validateTiers(tiers: PriceTier[]): void {
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  sorted.forEach((t, i) => {
    if (!Number.isInteger(t.minQty) || t.minQty < 1) {
      throw new PricingError(`Tier minQty must be a positive integer (got ${t.minQty})`);
    }
    if (t.maxQty !== null && t.maxQty < t.minQty) {
      throw new PricingError(`Tier ${t.minQty}-${t.maxQty}: maxQty is below minQty`);
    }
    if (D(t.unitPrice).lte(0)) throw new PricingError("Tier unit price must be positive");
    const next = sorted[i + 1];
    if (next) {
      if (t.maxQty === null) {
        throw new PricingError(`Tier from ${t.minQty} is unbounded but another tier follows`);
      }
      if (next.minQty <= t.maxQty) {
        throw new PricingError(`Tiers ${t.minQty}-${t.maxQty} and ${next.minQty}+ overlap`);
      }
    }
  });
}

function bestPromotion(
  promos: Promotion[],
  base: Decimal,
  customerType: "RETAIL" | "WHOLESALE",
  now: Date,
): Decimal | null {
  let best: Decimal | null = null;
  for (const p of promos) {
    if (p.isActive === false || now < p.validFrom || now > p.validTo) continue;
    if (p.appliesTo && p.appliesTo !== customerType) continue;
    let price = base;
    if (p.percentOff != null) price = price.mul(new Decimal(100).minus(D(p.percentOff))).div(100);
    if (p.amountOff != null) price = price.minus(D(p.amountOff));
    if (price.lt(0)) price = new Decimal(0);
    if (best === null || price.lt(best)) best = price;
  }
  return best;
}

export function resolvePrice(input: PriceInput): PriceResult {
  const { quantity } = input;
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new PricingError("Quantity must be a positive integer");
  }
  const now = input.now ?? new Date();
  const currency = input.currency ?? "KHR";
  const retail = D(input.retailPrice);
  const customerType = input.customer?.type ?? "RETAIL";
  const isApprovedWholesale =
    input.customer?.type === "WHOLESALE" && input.customer.wholesaleApproved;

  let base = retail;
  let source: PriceSource = "RETAIL";

  // 1. customer-specific
  const customerTier = (input.customer ? (input.customerLists ?? []) : [])
    .filter((l) => isListValid(l, now))
    .map((l) => findTier(l.tiers, quantity))
    .filter((t): t is PriceTier => !!t)
    .map((t) => D(t.unitPrice))
    .sort((a, b) => a.comparedTo(b))[0];

  if (customerTier) {
    base = customerTier;
    source = "CUSTOMER";
  } else if (isApprovedWholesale && input.wholesaleList && isListValid(input.wholesaleList, now)) {
    // 2. wholesale tier
    const tier = findTier(input.wholesaleList.tiers, quantity);
    if (tier) {
      base = D(tier.unitPrice);
      source = "WHOLESALE_TIER";
    }
  }

  // 4. promotion (not stacked on negotiated prices)
  let unit = base;
  if (source !== "CUSTOMER" && input.promotions?.length) {
    const promo = bestPromotion(input.promotions, base, customerType, now);
    if (promo && promo.lt(base)) {
      unit = promo;
      source = "PROMO";
    }
  }

  unit = roundMoney(unit, currency);
  const discountPerUnit = Decimal.max(retail.minus(unit), 0);
  return {
    listUnitPrice: retail,
    baseUnitPrice: base,
    unitPrice: unit,
    source,
    discountPerUnit,
    lineTotal: unit.mul(quantity),
  };
}
