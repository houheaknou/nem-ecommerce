import { describe, expect, it } from "vitest";
import { classifyExpense, computePnl } from "./pnl";

describe("profit calculation", () => {
  it("computes gross/net profit and margins", () => {
    const r = computePnl({
      retailSales: 1_000_000,
      wholesaleSales: 2_000_000,
      deliveryRevenue: 100_000,
      salesDiscounts: 50_000,
      salesReturns: 50_000,
      cogs: 1_500_000,
      deliveryExpenses: 80_000,
      operatingExpenses: 400_000,
      inventoryWriteOffs: 20_000,
    });
    expect(r.netProductSales.toNumber()).toBe(2_900_000);
    expect(r.totalRevenue.toNumber()).toBe(3_000_000);
    expect(r.grossProfit.toNumber()).toBe(1_400_000);
    expect(r.netProfit.toNumber()).toBe(3_000_000 - 1_500_000 - 80_000 - 400_000 - 20_000);
    expect(r.netMarginPct?.toNumber()).toBe(33.33);
  });

  it("margins are null with zero revenue (no divide-by-zero)", () => {
    const r = computePnl({
      retailSales: 0, wholesaleSales: 0, deliveryRevenue: 0, salesDiscounts: 0, salesReturns: 0,
      cogs: 0, deliveryExpenses: 0, operatingExpenses: 10, inventoryWriteOffs: 0,
    });
    expect(r.netMarginPct).toBeNull();
    expect(r.netProfit.toNumber()).toBe(-10);
  });
});

describe("expense classification", () => {
  it("inventory purchases are capitalised, not expensed (no double count with COGS)", () => {
    expect(classifyExpense("INVENTORY")).toBe("capitalised");
    expect(classifyExpense("DELIVERY")).toBe("deliveryExpenses");
    expect(classifyExpense("OPERATING")).toBe("operatingExpenses");
  });
});
