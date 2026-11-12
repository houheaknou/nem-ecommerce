import "server-only";
import type { Tx } from "@/lib/db";
import { UserError } from "@/lib/action";
import type { AddressInput } from "./schemas";

/**
 * Shared address logic for admin and customer self-service.
 * Keeps exactly one default address per customer.
 */
export async function upsertAddress(tx: Tx, customerId: string, input: AddressInput) {
  const { id, ...rest } = input;
  const data = {
    ...rest,
    label: rest.label || null,
    street: rest.street || null,
    deliveryNotes: rest.deliveryNotes || null,
  };
  if (id) {
    const existing = await tx.customerAddress.findUnique({ where: { id } });
    if (!existing || existing.customerId !== customerId) throw new UserError("NOT_FOUND");
  }
  const count = await tx.customerAddress.count({ where: { customerId } });
  const makeDefault = data.isDefault || count === 0 || (count === 1 && !!id);
  if (makeDefault) await tx.customerAddress.updateMany({ where: { customerId }, data: { isDefault: false } });
  const row = id
    ? await tx.customerAddress.update({ where: { id }, data: { ...data, isDefault: makeDefault } })
    : await tx.customerAddress.create({ data: { ...data, customerId, isDefault: makeDefault } });
  return row;
}

export async function removeAddress(tx: Tx, customerId: string, addressId: string) {
  const existing = await tx.customerAddress.findUnique({ where: { id: addressId } });
  if (!existing || existing.customerId !== customerId) throw new UserError("NOT_FOUND");
  await tx.customerAddress.delete({ where: { id: addressId } });
  if (existing.isDefault) {
    const next = await tx.customerAddress.findFirst({ where: { customerId }, orderBy: { createdAt: "asc" } });
    if (next) await tx.customerAddress.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  return existing;
}
