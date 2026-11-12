import "server-only";
import { db } from "@/lib/db";

/** Everything the /account page shows, scoped to the logged-in customer. */
export async function getMyAccount(customerId: string) {
  const c = await db.customer.findUnique({
    where: { id: customerId },
    include: {
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] },
      wholesaleApprovals: { orderBy: { createdAt: "desc" }, take: 1 },
      orders: {
        orderBy: { orderedAt: "desc" },
        take: 20,
        select: { id: true, orderNo: true, orderedAt: true, status: true, grandTotal: true },
      },
    },
  });
  if (!c) return null;
  return {
    code: c.code,
    fullName: c.fullName,
    phone: c.phone,
    email: c.email,
    type: c.type,
    wholesaleStatus: c.wholesaleStatus,
    businessName: c.businessName ?? "",
    lastApplication: c.wholesaleApprovals[0]
      ? { status: c.wholesaleApprovals[0].status, reviewNote: c.wholesaleApprovals[0].reviewNote }
      : null,
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
    orders: c.orders.map((o) => ({ ...o, orderedAt: o.orderedAt.toISOString().slice(0, 10), grandTotal: Number(o.grandTotal) })),
  };
}
