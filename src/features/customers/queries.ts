import "server-only";
import Decimal from "decimal.js";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { phoneSearchFragment } from "@/lib/phone";

export const CUSTOMER_PAGE_SIZE = 25;

/** Server-side search + pagination (customer tables can hold thousands of rows). */
export async function listCustomers(opts: { q?: string; type?: string; status?: string; page?: number }) {
  const page = Math.max(1, opts.page ?? 1);
  const q = opts.q?.trim() ?? "";
  const digits = q.replace(/\D/g, "");
  const where: Prisma.CustomerWhereInput = {
    deletedAt: null,
    isGuest: false,
    ...(opts.type === "RETAIL" || opts.type === "WHOLESALE" ? { type: opts.type } : {}),
    ...(opts.status && ["PENDING", "APPROVED", "REJECTED"].includes(opts.status)
      ? { wholesaleStatus: opts.status as "PENDING" | "APPROVED" | "REJECTED" }
      : {}),
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { businessName: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            ...(digits.length >= 3 ? [{ phoneNormalized: { contains: phoneSearchFragment(q) } }] : []),
          ],
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    db.customer.count({ where }),
    db.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * CUSTOMER_PAGE_SIZE,
      take: CUSTOMER_PAGE_SIZE,
      select: {
        id: true,
        code: true,
        fullName: true,
        phone: true,
        businessName: true,
        type: true,
        wholesaleStatus: true,
        acquisitionSource: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
  ]);
  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / CUSTOMER_PAGE_SIZE)),
    rows: rows.map(({ _count, createdAt, ...c }) => ({ ...c, orderCount: _count.orders, createdAt: createdAt.toISOString().slice(0, 10) })),
  };
}

export async function getCustomer(id: string) {
  const c = await db.customer.findUnique({
    where: { id },
    include: {
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] },
      wholesaleApprovals: { orderBy: { createdAt: "desc" }, take: 5 },
      priceLists: { include: { priceList: { select: { id: true, name: true, isActive: true } } } },
      orders: {
        orderBy: { orderedAt: "desc" },
        take: 10,
        select: { id: true, orderNo: true, orderedAt: true, status: true, paymentStatus: true, grandTotal: true },
      },
    },
  });
  if (!c || c.deletedAt) return null;

  const [orderCount, completed, open] = await Promise.all([
    db.order.count({ where: { customerId: id, status: { notIn: ["DRAFT", "CANCELLED"] } } }),
    db.order.aggregate({ _sum: { grandTotal: true }, where: { customerId: id, status: "COMPLETED" } }),
    db.order.findMany({
      where: { customerId: id, status: { notIn: ["DRAFT", "CANCELLED", "RETURNED"] }, paymentStatus: { in: ["UNPAID", "PARTIALLY_PAID"] } },
      select: { grandTotal: true, amountPaid: true },
    }),
  ]);
  const outstanding = open.reduce((s, o) => s.plus(o.grandTotal.toString()).minus(o.amountPaid.toString()), new Decimal(0));

  return {
    id: c.id,
    code: c.code,
    fullName: c.fullName,
    phone: c.phone,
    email: c.email ?? "",
    type: c.type,
    wholesaleStatus: c.wholesaleStatus,
    businessName: c.businessName ?? "",
    contactPerson: c.contactPerson ?? "",
    creditLimit: Number(c.creditLimit),
    acquisitionSource: c.acquisitionSource,
    notes: c.notes ?? "",
    hasLogin: !!c.userId,
    createdAt: c.createdAt.toISOString().slice(0, 10),
    addresses: c.addresses.map((a) => ({
      id: a.id,
      label: a.label ?? "",
      recipientName: a.recipientName,
      phone: a.phone,
      provinceId: a.provinceId,
      districtId: a.districtId,
      street: a.street ?? "",
      deliveryNotes: a.deliveryNotes ?? "",
      isDefault: a.isDefault,
    })),
    approvals: c.wholesaleApprovals.map((w) => ({ id: w.id, status: w.status, businessName: w.businessName, createdAt: w.createdAt.toISOString().slice(0, 10), reviewNote: w.reviewNote })),
    priceLists: c.priceLists.map((p) => p.priceList),
    orders: c.orders.map((o) => ({ ...o, orderedAt: o.orderedAt.toISOString().slice(0, 10), grandTotal: Number(o.grandTotal) })),
    stats: {
      orderCount,
      totalSpending: Number(completed._sum.grandTotal ?? 0),
      outstanding: outstanding.toNumber(),
    },
  };
}
export type CustomerDetail = NonNullable<Awaited<ReturnType<typeof getCustomer>>>;

export async function listLocations() {
  const provinces = await db.province.findMany({
    orderBy: { nameEn: "asc" },
    include: { districts: { orderBy: { nameEn: "asc" }, select: { id: true, nameKm: true, nameEn: true } } },
  });
  return provinces.map((p) => ({ id: p.id, nameKm: p.nameKm, nameEn: p.nameEn, districts: p.districts }));
}
export type LocationTree = Awaited<ReturnType<typeof listLocations>>;

export async function listPendingWholesale() {
  const rows = await db.wholesaleApproval.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { customer: { select: { id: true, code: true, fullName: true, phone: true, email: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    businessName: r.businessName,
    businessType: r.businessType ?? "",
    expectedMonthlyPacks: r.expectedMonthlyPacks,
    createdAt: r.createdAt.toISOString().slice(0, 10),
    customer: r.customer,
  }));
}
