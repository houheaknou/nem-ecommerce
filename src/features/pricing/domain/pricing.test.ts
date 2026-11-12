import { describe, expect, it } from "vitest";
import { PricingError, resolvePrice, validateTiers, type TierList } from "./pricing";

const wholesale: TierList = {
  tiers: [
    { minQty: 1, maxQty: 9, unitPrice: 5000 },
    { minQty: 10, maxQty: 49, unitPrice: 4500 },
    { minQty: 50, maxQty: 99, unitPrice: 4000 },
    { minQty: 100, maxQty: null, unitPrice: 3500 },
  ],
};
const approved = { type: "WHOLESALE" as const, wholesaleApproved: true };
const now = new Date("2026-11-12T00:00:00Z");

describe("retail price calculation", () => {
  it("guest pays retail", () => {
    const r = resolvePrice({ retailPrice: 5000, quantity: 3, customer: null, wholesaleList: wholesale, now });
    expect(r.source).toBe("RETAIL");
    expect(r.unitPrice.toNumber()).toBe(5000);
    expect(r.lineTotal.toNumber()).toBe(15000);
  });

  it("retail customer ordering 100 packs still pays retail (no wholesale approval)", () => {
    const r = resolvePrice({
      retailPrice: 5000,
      quantity: 100,
      customer: { type: "RETAIL", wholesaleApproved: false },
      wholesaleList: wholesale,
      now,
    });
    expect(r.source).toBe("RETAIL");
  });

  it("rejects non-integer or zero quantity", () => {
    expect(() => resolvePrice({ retailPrice: 5000, quantity: 0, customer: null })).toThrow(PricingError);
    expect(() => resolvePrice({ retailPrice: 5000, quantity: 1.5, customer: null })).toThrow(PricingError);
  });
});

describe("wholesale tier selection", () => {
  it.each([
    [9, 5000],
    [10, 4500],
    [49, 4500],
    [50, 4000],
    [99, 4000],
    [100, 3500],
    [1000, 3500],
  ])("qty %i -> %i", (qty, price) => {
    const r = resolvePrice({ retailPrice: 5000, quantity: qty, customer: approved, wholesaleList: wholesale, now });
    expect(r.unitPrice.toNumber()).toBe(price);
    expect(r.source).toBe("WHOLESALE_TIER");
  });

  it("pending wholesale customer is not eligible", () => {
    const r = resolvePrice({
      retailPrice: 5000,
      quantity: 50,
      customer: { type: "WHOLESALE", wholesaleApproved: false },
      wholesaleList: wholesale,
      now,
    });
    expect(r.source).toBe("RETAIL");
  });

  it("expired wholesale list is ignored", () => {
    const r = resolvePrice({
      retailPrice: 5000,
      quantity: 50,
      customer: approved,
      wholesaleList: { ...wholesale, validTo: new Date("2026-01-01") },
      now,
    });
    expect(r.source).toBe("RETAIL");
  });

  it("detects overlapping and unbounded-middle tiers", () => {
    expect(() =>
      validateTiers([
        { minQty: 1, maxQty: 10, unitPrice: 5000 },
        { minQty: 10, maxQty: 20, unitPrice: 4500 },
      ]),
    ).toThrow(/overlap/);
    expect(() =>
      validateTiers([
        { minQty: 1, maxQty: null, unitPrice: 5000 },
        { minQty: 10, maxQty: 20, unitPrice: 4500 },
      ]),
    ).toThrow(/unbounded/);
    expect(() => validateTiers(wholesale.tiers)).not.toThrow();
  });
});

describe("customer-specific pricing", () => {
  it("beats the wholesale tier and is not stacked with promotions", () => {
    const r = resolvePrice({
      retailPrice: 5000,
      quantity: 20,
      customer: approved,
      customerLists: [{ tiers: [{ minQty: 1, maxQty: null, unitPrice: 4200 }] }],
      wholesaleList: wholesale,
      promotions: [{ percentOff: 50, validFrom: new Date("2026-01-01"), validTo: new Date("2027-01-01") }],
      now,
    });
    expect(r.source).toBe("CUSTOMER");
    expect(r.unitPrice.toNumber()).toBe(4200);
  });

  it("falls through to wholesale when negotiated list does not cover the quantity", () => {
    const r = resolvePrice({
      retailPrice: 5000,
      quantity: 5,
      customer: approved,
      customerLists: [{ tiers: [{ minQty: 100, maxQty: null, unitPrice: 3000 }] }],
      wholesaleList: wholesale,
      now,
    });
    expect(r.source).toBe("WHOLESALE_TIER");
    expect(r.unitPrice.toNumber()).toBe(5000);
  });
});

describe("promotions", () => {
  it("applies the best valid promotion on top of retail", () => {
    const r = resolvePrice({
      retailPrice: 5000,
      quantity: 2,
      customer: null,
      promotions: [
        { percentOff: 10, validFrom: new Date("2026-11-01"), validTo: new Date("2026-11-30") },
        { amountOff: 1000, validFrom: new Date("2026-11-01"), validTo: new Date("2026-11-30") },
        { percentOff: 90, validFrom: new Date("2025-01-01"), validTo: new Date("2025-02-01") }, // expired
      ],
      now,
    });
    expect(r.source).toBe("PROMO");
    expect(r.unitPrice.toNumber()).toBe(4000);
    expect(r.discountPerUnit.toNumber()).toBe(1000);
  });
});
