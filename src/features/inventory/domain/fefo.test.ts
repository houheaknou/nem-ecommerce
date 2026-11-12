import { describe, expect, it } from "vitest";
import { allocateFefo, allocationCost, InsufficientStockError, sellableQty, type BatchStock } from "./fefo";

const today = new Date("2026-11-12T08:00:00Z");
const d = (s: string) => new Date(`${s}T00:00:00Z`);

const batches: BatchStock[] = [
  { id: "late", expiryDate: d("2026-11-20"), onHandQty: 50, reservedQty: 0, unitCost: 3000 },
  { id: "early", expiryDate: d("2026-11-15"), onHandQty: 10, reservedQty: 4, unitCost: 2800 },
  { id: "expired", expiryDate: d("2026-11-10"), onHandQty: 100, reservedQty: 0, unitCost: 2500 },
  { id: "today", expiryDate: d("2026-11-12"), onHandQty: 100, reservedQty: 0, unitCost: 2500 },
];

describe("FEFO allocation & expiry restrictions", () => {
  it("takes the earliest-expiring sellable batch first, net of reservations", () => {
    const a = allocateFefo(batches, 10, { onDate: today });
    expect(a).toEqual([
      expect.objectContaining({ batchId: "early", quantity: 6 }),
      expect.objectContaining({ batchId: "late", quantity: 4 }),
    ]);
    expect(allocationCost(a).toNumber()).toBe(6 * 2800 + 4 * 3000);
  });

  it("never allocates expired stock or stock expiring today", () => {
    const a = allocateFefo(batches, 56, { onDate: today });
    expect(a.map((x) => x.batchId)).not.toContain("expired");
    expect(a.map((x) => x.batchId)).not.toContain("today");
  });

  it("honours minimum remaining shelf life", () => {
    // 'early' has 3 days left; requiring 5 excludes it
    expect(sellableQty(batches, today, 5)).toBe(50);
    const a = allocateFefo(batches, 5, { onDate: today, minRemainingShelfDays: 5 });
    expect(a).toEqual([expect.objectContaining({ batchId: "late", quantity: 5 })]);
  });
});

describe("overselling prevention", () => {
  it("throws when sellable stock is insufficient", () => {
    expect(() => allocateFefo(batches, 57, { onDate: today })).toThrow(InsufficientStockError);
  });

  it("reserved stock is not sellable", () => {
    const fully: BatchStock[] = [{ id: "x", expiryDate: d("2026-12-01"), onHandQty: 5, reservedQty: 5, unitCost: 1 }];
    expect(() => allocateFefo(fully, 1, { onDate: today })).toThrow(InsufficientStockError);
  });
});
