import { describe, expect, it } from "vitest";
import { productSchema, slugify } from "./schemas";
import { customerSchema } from "@/features/customers/schemas";
import { registerSchema } from "@/features/account/schemas";

const variant = {
  sku: "NEM-S",
  nameKm: "តូច",
  nameEn: "Small",
  packageSize: "",
  unitsPerPackage: 10,
  weightGrams: 250,
  packagingGrams: 20,
  retailPrice: 5000,
  trackStock: true,
  minStock: 10,
  isActive: true,
};
const product = {
  slug: "nem",
  nameKm: "ណែម",
  nameEn: "Nem",
  categoryId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  shelfLifeDays: 10,
  isActive: true,
  isFeatured: false,
  images: [],
  variants: [variant],
};

describe("product validation", () => {
  it("accepts a valid product", () => {
    expect(productSchema.safeParse(product).success).toBe(true);
  });
  it("rejects duplicate SKUs (case-insensitive)", () => {
    const r = productSchema.safeParse({ ...product, variants: [variant, { ...variant, sku: "nem-s" }] });
    expect(r.success).toBe(false);
  });
  it("rejects zero retail price and bad slugs", () => {
    expect(productSchema.safeParse({ ...product, variants: [{ ...variant, retailPrice: 0 }] }).success).toBe(false);
    expect(productSchema.safeParse({ ...product, slug: "Nem Battambang!" }).success).toBe(false);
  });
  it("slugify", () => {
    expect(slugify("Nem Battambang  Special Pack")).toBe("nem-battambang-special-pack");
  });
});

describe("customer & registration validation", () => {
  const c = { fullName: "Sok Dara", phone: "+855 12 345 678", email: "", type: "RETAIL", creditLimit: 0, acquisitionSource: "PHONE" };
  it("accepts Cambodian numbers in any format", () => {
    expect(customerSchema.safeParse(c).success).toBe(true);
  });
  it("rejects invalid phones", () => {
    expect(customerSchema.safeParse({ ...c, phone: "123" }).success).toBe(false);
  });
  it("registration requires matching passwords of 10+ chars", () => {
    const base = { fullName: "Sok", phone: "012345678", email: "a@b.co", password: "correct-horse", confirmPassword: "correct-horse" };
    expect(registerSchema.safeParse(base).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, confirmPassword: "nope-nope-nope" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "short", confirmPassword: "short" }).success).toBe(false);
  });
});
