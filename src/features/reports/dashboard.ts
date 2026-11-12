import "server-only";
import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { computePnl } from "@/features/finance/domain/pnl";

const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);

const dec = (v: { toString(): string } | null | undefined) => new Decimal(v?.toString() ?? 0);

/** Revenue recognised = COMPLETED orders (see finance/domain/pnl.ts). */
export async function getDashboardStats(includeFinancials: boolean) {
  const today = startOfDay();
  const monthStart = startOfMonth();
  // 7-day window; expiry dates are stored as UTC dates, so a short window
  // can miss batches at the boundary for UTC+7.
  const expiryHorizon = new Date(today.getTime() + 7 * 86_400_000);

  const [todaySales, monthByType, totalOrders, pendingOrders, pendingDeliveries, recentOrders, variants, expiring] =
    await Promise.all([
      db.order.aggregate({
        _sum: { grandTotal: true },
        where: { orderedAt: { gte: today }, status: { notIn: ["CANCELLED", "DRAFT"] } },
      }),
      db.order.groupBy({
        by: ["customerType"],
        _sum: { subtotal: true, discountTotal: true, deliveryFee: true },
        where: { status: "COMPLETED", completedAt: { gte: monthStart } },
      }),
      db.order.count({ where: { orderedAt: { gte: monthStart }, status: { not: "DRAFT" } } }),
      db.order.count({ where: { status: "PENDING" } }),
      db.delivery.count({ where: { status: { in: ["PENDING", "ASSIGNED", "PICKED_UP", "IN_TRANSIT"] } } }),
      db.order.findMany({
        take: 6,
        orderBy: { orderedAt: "desc" },
        select: { id: true, orderNo: true, grandTotal: true, status: true, source: true, customer: { select: { fullName: true } } },
      }),
      db.productVariant.findMany({
        where: { isActive: true, trackStock: true },
        select: {
          id: true, sku: true, nameKm: true, nameEn: true, minStock: true,
          product: { select: { nameKm: true, nameEn: true } },
          batches: { where: { expiryDate: { gt: today } }, select: { onHandQty: true, reservedQty: true } },
        },
      }),
      db.inventoryBatch.findMany({
        where: { onHandQty: { gt: 0 }, expiryDate: { lte: expiryHorizon } },
        orderBy: { expiryDate: "asc" },
        take: 8,
        select: { id: true, batchNo: true, expiryDate: true, onHandQty: true, variant: { select: { sku: true } } },
      }),
    ]);

  const lowStock = variants
    .map((v) => ({ ...v, available: v.batches.reduce((n, b) => n + b.onHandQty - b.reservedQty, 0) }))
    .filter((v) => v.available <= v.minStock)
    .slice(0, 8);

  const retail = monthByType.find((r) => r.customerType === "RETAIL")?._sum;
  const wholesale = monthByType.find((r) => r.customerType === "WHOLESALE")?._sum;

  let financials: null | {
    totalExpenses: string;
    grossProfit: string;
    netProfit: string;
  } = null;

  if (includeFinancials) {
    const [cogsAgg, expenseRows, writeOffs, deliveryCost] = await Promise.all([
      db.orderItem.aggregate({ _sum: { cogs: true }, where: { order: { status: "COMPLETED", completedAt: { gte: monthStart } } } }),
      db.expense.findMany({
        where: { status: "APPROVED", date: { gte: monthStart } },
        select: { amountKhr: true, category: { select: { class: true } } },
      }),
      db.inventoryWriteOff.findMany({ where: { createdAt: { gte: monthStart } }, select: { quantity: true, unitCost: true } }),
      db.delivery.aggregate({ _sum: { actualCost: true }, where: { order: { status: "COMPLETED", completedAt: { gte: monthStart } } } }),
    ]);
    const byClass = (cls: string) =>
      expenseRows.filter((e) => e.category.class === cls).reduce((s, e) => s.plus(dec(e.amountKhr)), new Decimal(0));
    const opEx = byClass("OPERATING");
    const delEx = byClass("DELIVERY").plus(dec(deliveryCost._sum.actualCost));
    const wo = writeOffs.reduce((s, w) => s.plus(dec(w.unitCost).mul(w.quantity)), new Decimal(0));
    const pnl = computePnl({
      retailSales: dec(retail?.subtotal).plus(dec(retail?.discountTotal)),
      wholesaleSales: dec(wholesale?.subtotal).plus(dec(wholesale?.discountTotal)),
      deliveryRevenue: dec(retail?.deliveryFee).plus(dec(wholesale?.deliveryFee)),
      salesDiscounts: dec(retail?.discountTotal).plus(dec(wholesale?.discountTotal)),
      salesReturns: 0,
      cogs: dec(cogsAgg._sum.cogs),
      deliveryExpenses: delEx,
      operatingExpenses: opEx,
      inventoryWriteOffs: wo,
    });
    financials = {
      totalExpenses: pnl.totalExpenses.toString(),
      grossProfit: pnl.grossProfit.toString(),
      netProfit: pnl.netProfit.toString(),
    };
  }

  return {
    todaySales: dec(todaySales._sum.grandTotal).toString(),
    retailRevenue: dec(retail?.subtotal).toString(),
    wholesaleRevenue: dec(wholesale?.subtotal).toString(),
    totalOrders,
    pendingOrders,
    pendingDeliveries,
    recentOrders: recentOrders.map((o) => ({ ...o, grandTotal: o.grandTotal.toString() })),
    lowStock,
    expiring,
    financials,
  };
}
