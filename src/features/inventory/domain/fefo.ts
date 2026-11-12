import Decimal from "decimal.js";
import { D, type MoneyInput } from "@/lib/money";

/**
 * FEFO allocation: take stock from the batch that expires first.
 * A batch is eligible only if, on the ship date, it still has at least
 * `minRemainingShelfDays` before expiry. Expired stock is never eligible.
 */

export interface BatchStock {
  id: string;
  expiryDate: Date;
  onHandQty: number;
  reservedQty: number;
  unitCost: MoneyInput;
}

export interface Allocation {
  batchId: string;
  quantity: number;
  unitCost: Decimal;
}

export class InsufficientStockError extends Error {
  constructor(
    public readonly requested: number,
    public readonly available: number,
  ) {
    super(`Insufficient sellable stock: requested ${requested}, available ${available}`);
  }
}

const DAY_MS = 86_400_000;

function startOfDayUtc(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function daysUntilExpiry(expiry: Date, onDate: Date): number {
  return Math.floor((startOfDayUtc(expiry) - startOfDayUtc(onDate)) / DAY_MS);
}

export function isSellable(batch: BatchStock, onDate: Date, minRemainingShelfDays = 0): boolean {
  const days = daysUntilExpiry(batch.expiryDate, onDate);
  // expiry day itself counts as expired for shipping: need days >= max(1, min)
  return days >= Math.max(1, minRemainingShelfDays);
}

export function availableQty(batch: BatchStock): number {
  return Math.max(0, batch.onHandQty - batch.reservedQty);
}

export function sellableQty(
  batches: BatchStock[],
  onDate: Date,
  minRemainingShelfDays = 0,
): number {
  return batches
    .filter((b) => isSellable(b, onDate, minRemainingShelfDays))
    .reduce((n, b) => n + availableQty(b), 0);
}

export function allocateFefo(
  batches: BatchStock[],
  quantity: number,
  opts: { onDate: Date; minRemainingShelfDays?: number },
): Allocation[] {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Quantity must be a positive integer");
  }
  const eligible = batches
    .filter((b) => isSellable(b, opts.onDate, opts.minRemainingShelfDays ?? 0))
    .filter((b) => availableQty(b) > 0)
    .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime() || a.id.localeCompare(b.id));

  const total = eligible.reduce((n, b) => n + availableQty(b), 0);
  if (total < quantity) throw new InsufficientStockError(quantity, total);

  const out: Allocation[] = [];
  let remaining = quantity;
  for (const b of eligible) {
    if (remaining === 0) break;
    const take = Math.min(availableQty(b), remaining);
    out.push({ batchId: b.id, quantity: take, unitCost: D(b.unitCost) });
    remaining -= take;
  }
  return out;
}

/** Cost of goods for a set of allocations (immutable snapshot at shipment). */
export function allocationCost(allocs: Allocation[]): Decimal {
  return allocs.reduce((s, a) => s.plus(a.unitCost.mul(a.quantity)), new Decimal(0));
}
