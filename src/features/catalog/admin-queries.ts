import "server-only";
import { db } from "@/lib/db";

export async function listCategories() {
  const rows = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return rows.map(({ _count, ...c }) => ({ ...c, productCount: _count.products }));
}

/** Product list for admin. Cost is only included when the viewer may see it. */
export async function listAdminProducts() {
  const today = new Date();
  const rows = await db.product.findMany({
    where: { deletedAt: null },
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    include: {
      category: { select: { nameKm: true, nameEn: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      variants: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          retailPrice: true,
          isActive: true,
          batches: { where: { expiryDate: { gt: today } }, select: { onHandQty: true, reservedQty: true } },
        },
      },
    },
  });
  return rows.map((p) => {
    const prices = p.variants.filter((v) => v.isActive).map((v) => Number(v.retailPrice));
    return {
      id: p.id,
      slug: p.slug,
      nameKm: p.nameKm,
      nameEn: p.nameEn,
      categoryKm: p.category.nameKm,
      categoryEn: p.category.nameEn,
      imageUrl: p.images[0]?.url ?? null,
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      variantCount: p.variants.length,
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      available: p.variants.reduce(
        (n, v) => n + v.batches.reduce((m, b) => m + b.onHandQty - b.reservedQty, 0),
        0,
      ),
    };
  });
}
export type AdminProductRow = Awaited<ReturnType<typeof listAdminProducts>>[number];

export async function getProductForEdit(id: string, canSeeCost: boolean) {
  const p = await db.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: {
        orderBy: { sortOrder: "asc" },
        include: { priceHistory: { orderBy: { changedAt: "desc" }, take: 10 } },
      },
    },
  });
  if (!p) return null;
  return {
    id: p.id,
    slug: p.slug,
    nameKm: p.nameKm,
    nameEn: p.nameEn,
    descriptionKm: p.descriptionKm ?? "",
    descriptionEn: p.descriptionEn ?? "",
    categoryId: p.categoryId,
    shelfLifeDays: p.shelfLifeDays,
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    images: p.images.map((i) => i.url),
    variants: p.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      nameKm: v.nameKm,
      nameEn: v.nameEn,
      packageSize: v.packageSize ?? "",
      unitsPerPackage: v.unitsPerPackage,
      weightGrams: v.weightGrams,
      packagingGrams: v.packagingGrams,
      retailPrice: Number(v.retailPrice),
      // Never serialise cost to the browser for users without cost.view.
      ...(canSeeCost ? { costPrice: Number(v.costPrice) } : {}),
      trackStock: v.trackStock,
      minStock: v.minStock,
      isActive: v.isActive,
    })),
    priceHistory: p.variants.flatMap((v) =>
      v.priceHistory
        .filter((h) => canSeeCost || h.field !== "costPrice")
        .map((h) => ({
          id: h.id,
          sku: v.sku,
          field: h.field,
          oldValue: Number(h.oldValue),
          newValue: Number(h.newValue),
          changedAt: h.changedAt.toISOString(),
        })),
    ),
  };
}
