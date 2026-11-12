import Decimal from "decimal.js";
import { D, ZERO, type MoneyInput } from "@/lib/money";

/**
 * Management P&L (not a statutory statement).
 * Recognition rules:
 *  - Revenue is recognised when an order is COMPLETED (delivered), at the
 *    snapshot prices stored on order_items. Cancelled orders never count.
 *  - COGS = sum of order_item.cogs (batch cost snapshot at shipment).
 *  - Expenses are recognised by expense.date, status APPROVED only.
 *  - Expenses in an INVENTORY-class category are capitalised into batch cost
 *    and reach the P&L only through COGS — never as an operating expense.
 */

export type ExpenseClass = "OPERATING" | "DELIVERY" | "INVENTORY";
export type PnlBucket = "operatingExpenses" | "deliveryExpenses" | "capitalised";

export function classifyExpense(cls: ExpenseClass): PnlBucket {
  switch (cls) {
    case "OPERATING":
      return "operatingExpenses";
    case "DELIVERY":
      return "deliveryExpenses";
    case "INVENTORY":
      return "capitalised";
  }
}

export interface PnlInput {
  retailSales: MoneyInput; // gross, at list price
  wholesaleSales: MoneyInput;
  deliveryRevenue: MoneyInput;
  salesDiscounts: MoneyInput;
  salesReturns: MoneyInput;
  cogs: MoneyInput;
  deliveryExpenses: MoneyInput; // courier cost + DELIVERY-class expenses
  operatingExpenses: MoneyInput;
  inventoryWriteOffs: MoneyInput;
  otherLosses?: MoneyInput;
}

export interface PnlResult {
  grossSales: Decimal;
  netProductSales: Decimal;
  totalRevenue: Decimal;
  cogs: Decimal;
  grossProfit: Decimal;
  grossMarginPct: Decimal | null;
  totalExpenses: Decimal;
  netProfit: Decimal;
  netMarginPct: Decimal | null;
}

export function computePnl(i: PnlInput): PnlResult {
  const grossSales = D(i.retailSales).plus(D(i.wholesaleSales));
  const netProductSales = grossSales.minus(D(i.salesDiscounts)).minus(D(i.salesReturns));
  const totalRevenue = netProductSales.plus(D(i.deliveryRevenue));
  const cogs = D(i.cogs);
  const grossProfit = netProductSales.minus(cogs);
  const totalExpenses = D(i.deliveryExpenses)
    .plus(D(i.operatingExpenses))
    .plus(D(i.inventoryWriteOffs))
    .plus(D(i.otherLosses ?? 0));
  const netProfit = totalRevenue.minus(cogs).minus(totalExpenses);
  const pct = (num: Decimal, den: Decimal) =>
    den.eq(ZERO) ? null : num.div(den).mul(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  return {
    grossSales,
    netProductSales,
    totalRevenue,
    cogs,
    grossProfit,
    grossMarginPct: pct(grossProfit, netProductSales),
    totalExpenses,
    netProfit,
    netMarginPct: pct(netProfit, totalRevenue),
  };
}
