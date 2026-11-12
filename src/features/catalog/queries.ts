import "server-only";
import { db } from "@/lib/db";
import { sellableQty } from "@/features/inventory/domain/fefo";
import { getNumberSetting } from "@/features/settings/queries";

export type StockLevel = "IN_STOCK" | "LOW" | "OUT";

export async function listStorefrontProducts(opts: { featuredOnly?: boolean; categorySlug?: string } = {}) {
  const minShelf = await getNumberSetting("inventory.minRemainingShelfDays", 0);
  const today = new Date();
  const products = await db.product.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      ...(opts.featuredOnly ? { isFeatured: true } : {}),
      ...(opts.categorySlug ? { category: { slug: opts.categorySlug } } : {}),
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "asc" }],
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      variants: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          batches: { where: { onHandQty: { gt: 0 } } },
          priceListItems: {
            where: { priceList: { isWholesaleDefault: true, isActive: true } },
            orderBy: { unitPrice: "asc" },
            take: 1,
          },
        },
      },
    },
  });

  return products.map((p) => ({
    id: p.id,
    slug: p.slug,
    nameKm: p.nameKm,
    nameEn: p.nameEn,
    descriptionKm: p.descriptionKm,
    descriptionEn: p.descriptionEn,
    categoryKm: p.category.nameKm,
    categoryEn: p.category.nameEn,
    imageUrl: p.images[0]?.url ?? null,
    variants: p.variants.map((v) => {
      const available = v.trackStock ? sellableQty(v.batches, today, minShelf) : Number.MAX_SAFE_INTEGER;
      const stock: StockLevel = available <= 0 ? "OUT" : available <= v.minStock ? "LOW" : "IN_STOCK";
      return {
        id: v.id,
        sku: v.sku,
        nameKm: v.nameKm,
        nameEn: v.nameEn,
        packageSize: v.packageSize,
        weightGrams: v.weightGrams,
        retailPrice: v.retailPrice.toString(),
        wholesaleFrom: v.priceListItems[0]?.unitPrice.toString() ?? null,
        stock,
      };
    }),
  }));
}

export type StorefrontProduct = Awaited<ReturnType<typeof listStorefrontProducts>>[number];

export async function getStorefrontProduct(slug: string) {
  const all = await listStorefrontProducts();
  return all.find((p) => p.slug === slug) ?? null;
}
