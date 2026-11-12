import { describe, expect, it } from "vitest";
import { assertTransition, canTransition, cancellationReleasesStock, derivePaymentStatus, maxRefundable } from "./order-rules";
import { hasPermission } from "@/features/auth/permissions";

describe("order cancellation", () => {
  it("can cancel before shipment but not after", () => {
    expect(canTransition("CONFIRMED", "CANCELLED")).toBe(true);
    expect(canTransition("PREPARING", "CANCELLED")).toBe(true);
    expect(canTransition("SHIPPED", "CANCELLED")).toBe(false);
    expect(() => assertTransition("COMPLETED", "CANCELLED")).toThrow();
  });

  it("cancelling a confirmed order releases reserved stock; a pending one holds none", () => {
    expect(cancellationReleasesStock("CONFIRMED")).toBe(true);
    expect(cancellationReleasesStock("PENDING")).toBe(false);
  });
});

describe("payment & refund status", () => {
  it.each([
    [0, 0, "UNPAID"],
    [4000, 0, "PARTIALLY_PAID"],
    [10000, 0, "PAID"],
    [10000, 3000, "PARTIALLY_REFUNDED"],
    [10000, 10000, "REFUNDED"],
  ] as const)("paid %i refunded %i -> %s", (paid, refunded, status) => {
    expect(derivePaymentStatus(10000, paid, refunded)).toBe(status);
  });

  it("cannot refund more than was paid", () => {
    expect(maxRefundable(10000, 3000).toNumber()).toBe(7000);
    expect(maxRefundable(1000, 3000).toNumber()).toBe(0);
  });
});

describe("role permission enforcement", () => {
  it("only the right roles see costs and profit", () => {
    expect(hasPermission(["SALES_STAFF"], "cost.view")).toBe(false);
    expect(hasPermission(["SALES_STAFF"], "report.profit")).toBe(false);
    expect(hasPermission(["ACCOUNTANT"], "report.profit")).toBe(true);
    expect(hasPermission(["DELIVERY_STAFF"], "customer.view")).toBe(false);
    expect(hasPermission(["RETAIL_CUSTOMER"], "order.manage")).toBe(false);
    expect(hasPermission(["ADMIN"], "settings.manage")).toBe(false);
    expect(hasPermission(["SUPER_ADMIN"], "settings.manage")).toBe(true);
  });
});
