import Decimal from "decimal.js";
import { D, type MoneyInput } from "@/lib/money";

export type OrderStatus =
  | "DRAFT"
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELLED"
  | "RETURNED";

export type PaymentStatus =
  | "UNPAID"
  | "PARTIALLY_PAID"
  | "PAID"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["PENDING", "CANCELLED"],
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["COMPLETED", "RETURNED"],
  COMPLETED: ["RETURNED"],
  CANCELLED: [],
  RETURNED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Order cannot move from ${from} to ${to}`);
  }
}

/** Statuses in which stock is held by an ACTIVE reservation. */
export const RESERVING_STATUSES: OrderStatus[] = ["CONFIRMED", "PREPARING"];

/** Cancelling releases reservations; it is only possible before shipment. */
export function cancellationReleasesStock(from: OrderStatus): boolean {
  return RESERVING_STATUSES.includes(from);
}

/** Payment status is derived from verified money in/out, never set by hand. */
export function derivePaymentStatus(
  grandTotal: MoneyInput,
  amountPaid: MoneyInput,
  amountRefunded: MoneyInput,
): PaymentStatus {
  const total = D(grandTotal);
  const paid = D(amountPaid);
  const refunded = D(amountRefunded);
  if (refunded.gt(0)) {
    return refunded.gte(paid) ? "REFUNDED" : "PARTIALLY_REFUNDED";
  }
  if (paid.lte(0)) return "UNPAID";
  if (paid.gte(total)) return "PAID";
  return "PARTIALLY_PAID";
}

export function maxRefundable(amountPaid: MoneyInput, amountRefunded: MoneyInput): Decimal {
  return Decimal.max(D(amountPaid).minus(D(amountRefunded)), 0);
}
