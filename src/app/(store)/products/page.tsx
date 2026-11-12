import type { Metadata } from "next";
import { ProductCard } from "@/components/store/product-card";
import { listStorefrontProducts } from "@/features/catalog/queries";
import { getI18n } from "@/i18n/server";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage() {
  const [{ t, locale }, products] = await Promise.all([getI18n(), listStorefrontProducts()]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 font-heading text-3xl font-black">{t.product.allProducts}</h1>
      {products.length === 0 ? (
        <p className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground">{t.product.empty}</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} t={t} locale={locale} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
