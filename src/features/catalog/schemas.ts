import { z } from "zod";

const slug = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "a-z, 0-9 and dashes");

const name = z.string().trim().min(1).max(120);
const money = z.number().finite().min(0).max(1_000_000_000);

export const categorySchema = z.object({
  id: z.uuid().optional(),
  slug,
  nameKm: name,
  nameEn: name,
  sortOrder: z.number().int().min(0).max(9999),
  isActive: z.boolean(),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const variantSchema = z.object({
  id: z.uuid().optional(),
  sku: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9._-]+$/, "A-Z, 0-9, . _ -"),
  nameKm: name,
  nameEn: name,
  packageSize: z.string().trim().max(60).optional().or(z.literal("")),
  unitsPerPackage: z.number().int().min(1).max(100_000),
  weightGrams: z.number().int().min(1).max(100_000),
  packagingGrams: z.number().int().min(0).max(100_000),
  retailPrice: money.refine((v) => v > 0, "> 0"),
  /** Omitted by users without cost.view — server keeps the stored value. */
  costPrice: money.optional(),
  trackStock: z.boolean(),
  minStock: z.number().int().min(0).max(1_000_000),
  isActive: z.boolean(),
});
export type VariantInput = z.infer<typeof variantSchema>;

export const productSchema = z
  .object({
    id: z.uuid().optional(),
    slug,
    nameKm: name,
    nameEn: name,
    descriptionKm: z.string().trim().max(4000).optional().or(z.literal("")),
    descriptionEn: z.string().trim().max(4000).optional().or(z.literal("")),
    categoryId: z.uuid(),
    shelfLifeDays: z.number().int().min(1).max(3650),
    isActive: z.boolean(),
    isFeatured: z.boolean(),
    images: z.array(z.string().max(500)).max(6),
    variants: z.array(variantSchema).min(1).max(20),
  })
  .refine((p) => new Set(p.variants.map((v) => v.sku.toUpperCase())).size === p.variants.length, {
    message: "Duplicate SKU",
    path: ["variants"],
  });
export type ProductInput = z.infer<typeof productSchema>;

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}
