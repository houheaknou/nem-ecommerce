"use server";

import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { run, UserError } from "@/lib/action";
import { AuthError, requirePermission } from "@/features/auth/guard";
import { hasPermission } from "@/features/auth/permissions";
import { categorySchema, productSchema } from "./schemas";

function revalidateCatalog() {
  revalidatePath("/admin/products");
  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
}

export async function saveCategory(input: unknown) {
  return run(async () => {
    const user = await requirePermission("product.edit");
    const { id, ...data } = categorySchema.parse(input);
    const saved = await db.$transaction(async (tx) => {
      const before = id ? await tx.category.findUnique({ where: { id } }) : null;
      const row = id ? await tx.category.update({ where: { id }, data }) : await tx.category.create({ data });
      await audit(tx, { userId: user.id, action: id ? "category.update" : "category.create", entityType: "category", entityId: row.id, before, after: row });
      return row;
    });
    revalidateCatalog();
    return { id: saved.id };
  });
}

export async function deleteCategory(id: string) {
  return run(async () => {
    const user = await requirePermission("product.edit");
    await db.$transaction(async (tx) => {
      const before = await tx.category.delete({ where: { id } }); // P2003 -> IN_USE when products exist
      await audit(tx, { userId: user.id, action: "category.delete", entityType: "category", entityId: id, before });
    });
    revalidateCatalog();
  });
}

/**
 * Creates/updates a product with its variants in one transaction.
 * - Retail price changes need price.edit; cost changes need cost.view.
 * - Every price change is written to price_history.
 * - Variants are never deleted here (orders/batches reference them); they are deactivated.
 */
export async function saveProduct(input: unknown) {
  return run(async () => {
    const user = await requirePermission("product.edit");
    const canPrice = hasPermission(user.roleCodes, "price.edit");
    const canCost = hasPermission(user.roleCodes, "cost.view");
    const { id, images, variants, ...data } = productSchema.parse(input);
    const clean = {
      ...data,
      descriptionKm: data.descriptionKm || null,
      descriptionEn: data.descriptionEn || null,
    };

    const productId = await db.$transaction(async (tx) => {
      const before = id
        ? await tx.product.findUnique({ where: { id }, include: { variants: true, images: true } })
        : null;
      if (id && !before) throw new UserError("NOT_FOUND");

      const product = id
        ? await tx.product.update({ where: { id }, data: clean })
        : await tx.product.create({ data: clean });

      // Images: replace the ordered list.
      await tx.productImage.deleteMany({ where: { productId: product.id } });
      if (images.length) {
        await tx.productImage.createMany({
          data: images.map((url, i) => ({ productId: product.id, url, sortOrder: i, alt: clean.nameEn })),
        });
      }

      for (const [i, v] of variants.entries()) {
        const { id: variantId, costPrice, ...vd } = v;
        const existing = variantId ? before?.variants.find((x) => x.id === variantId) : undefined;
        if (variantId && !existing) throw new UserError("NOT_FOUND");
        const row = { ...vd, sku: vd.sku.toUpperCase(), packageSize: vd.packageSize || null, sortOrder: i };

        if (existing) {
          const retailChanged = !new Decimal(existing.retailPrice.toString()).eq(v.retailPrice);
          const costChanged = canCost && costPrice !== undefined && !new Decimal(existing.costPrice.toString()).eq(costPrice);
          if (retailChanged && !canPrice) throw new AuthError("FORBIDDEN", "price.edit");
          await tx.productVariant.update({
            where: { id: existing.id },
            data: { ...row, ...(costChanged ? { costPrice } : {}) },
          });
          const history = [];
          if (retailChanged) history.push({ field: "retailPrice", oldValue: existing.retailPrice, newValue: v.retailPrice });
          if (costChanged) history.push({ field: "costPrice", oldValue: existing.costPrice, newValue: costPrice! });
          if (history.length) {
            await tx.priceHistory.createMany({
              data: history.map((h) => ({ ...h, variantId: existing.id, changedById: user.id })),
            });
          }
        } else {
          if (!canPrice) throw new AuthError("FORBIDDEN", "price.edit");
          await tx.productVariant.create({
            data: { ...row, productId: product.id, costPrice: canCost && costPrice !== undefined ? costPrice : 0 },
          });
        }
      }

      // Variants missing from the payload are deactivated, not deleted.
      const keep = new Set(variants.map((v) => v.id).filter(Boolean));
      const dropped = (before?.variants ?? []).filter((v) => !keep.has(v.id)).map((v) => v.id);
      if (dropped.length) await tx.productVariant.updateMany({ where: { id: { in: dropped } }, data: { isActive: false } });

      await audit(tx, {
        userId: user.id,
        action: id ? "product.update" : "product.create",
        entityType: "product",
        entityId: product.id,
        before: before && { ...before, variants: before.variants.map(({ costPrice: _c, ...r }) => r) },
        after: { ...clean, images, variants: variants.map(({ costPrice: _c, ...r }) => r) },
      });
      return product.id;
    });

    revalidateCatalog();
    return { id: productId };
  });
}

/** Soft delete: hides from storefront, keeps history intact. */
export async function setProductActive(id: string, isActive: boolean) {
  return run(async () => {
    const user = await requirePermission("product.edit");
    await db.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data: { isActive } });
      await audit(tx, { userId: user.id, action: isActive ? "product.activate" : "product.deactivate", entityType: "product", entityId: id });
    });
    revalidateCatalog();
  });
}
