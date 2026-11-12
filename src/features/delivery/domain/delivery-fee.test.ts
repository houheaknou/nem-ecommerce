import { describe, expect, it } from "vitest";
import { computeDeliveryFee, DeliveryError, shipmentWeight, type DeliveryRateConfig } from "./delivery-fee";

const phnomPenhWeight: DeliveryRateConfig = {
  method: "WEIGHT",
  baseFee: 6000,
  includedGrams: 1000,
  stepGrams: 1000,
  feePerWeightStep: 2000,
  maxWeightGrams: 30000,
};

const byQuantity: DeliveryRateConfig = {
  method: "QUANTITY",
  baseFee: 6000,
  includedQty: 10,
  qtyStep: 10,
  feePerQtyStep: 2000,
};

describe("delivery by location + weight", () => {
  it.each([
    [800, 6000],
    [1000, 6000],
    [1001, 8000], // started kg is charged
    [2500, 10000],
    [3000, 10000],
  ])("%ig -> %i KHR", (grams, fee) => {
    expect(computeDeliveryFee(phnomPenhWeight, { weightGrams: grams, quantity: 1, subtotal: 0 }).fee.toNumber()).toBe(fee);
  });

  it("rejects shipments above the max weight", () => {
    expect(() => computeDeliveryFee(phnomPenhWeight, { weightGrams: 30001, quantity: 1, subtotal: 0 })).toThrow(DeliveryError);
  });

  it("weight rate ignores quantity", () => {
    const r = computeDeliveryFee(phnomPenhWeight, { weightGrams: 500, quantity: 500, subtotal: 0 });
    expect(r.quantityCharge.toNumber()).toBe(0);
    expect(r.fee.toNumber()).toBe(6000);
  });

  it("counts packaging weight", () => {
    expect(shipmentWeight([{ quantity: 4, weightGrams: 200, packagingGrams: 50 }])).toBe(1000);
  });
});

describe("delivery by location + quantity", () => {
  it.each([
    [1, 6000],
    [10, 6000],
    [11, 8000],
    [20, 8000],
    [25, 10000],
  ])("%i packs -> %i KHR", (qty, fee) => {
    expect(computeDeliveryFee(byQuantity, { weightGrams: 99999, quantity: qty, subtotal: 0 }).fee.toNumber()).toBe(fee);
  });

  it("free delivery threshold", () => {
    const r = computeDeliveryFee({ ...byQuantity, freeThreshold: 200000 }, { weightGrams: 0, quantity: 50, subtotal: 200000 });
    expect(r.free).toBe(true);
    expect(r.fee.toNumber()).toBe(0);
  });

  it("combined surcharges only on an explicit COMBINED rate", () => {
    const combined: DeliveryRateConfig = { ...phnomPenhWeight, ...byQuantity, method: "COMBINED" };
    const r = computeDeliveryFee(combined, { weightGrams: 2000, quantity: 11, subtotal: 0 });
    expect(r.fee.toNumber()).toBe(6000 + 2000 + 2000);
  });
});
