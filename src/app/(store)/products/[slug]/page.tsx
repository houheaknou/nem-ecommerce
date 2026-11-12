import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { NemIllustration } from "@/components/brand/nem-illustration";
import { ProductCard } from "@/components/store/product-card";
import { getStorefrontProduct } from "@/features/catalog/queries";
import { getI18n } from "@/i18n/server";
import { formatMoney } from "@/lib/money";

export default async function ProductDetailPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const [{ t, locale }, product] = await Promise.all([getI18n(), getStorefrontProduct(slug)]);
  if (!product) notFound();
  const description = locale === "km" ? product.descriptionKm : product.descriptionEn;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/products" className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" /> {t.common.back}
      </Link>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-square rounded-[2.5rem] bg-gradient-to-br from-accent to-secondary p-10">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt={product.nameEn} className="h-full w-full rounded-3xl object-cover" />
          ) : (
            <NemIllustration />
          )}
        </div>
        <div className="space-y-5">
          <div>
            <p className="text-sm font-bold text-primary">{locale === "km" ? product.categoryKm : product.categoryEn}</p>
            <h1 className="font-heading text-3xl font-black">{locale === "km" ? product.nameKm : product.nameEn}</h1>
            <p className="text-muted-foreground">{locale === "km" ? product.nameEn : product.nameKm}</p>
          </div>
          {description && <p className="leading-relaxed">{description}</p>}
          <table className="w-full overflow-hidden rounded-2xl border border-border text-sm">
            <thead className="bg-secondary text-left">
              <tr>
                <th className="p-3">{t.product.package}</th>
                <th className="p-3">{t.product.retailPrice}</th>
                <th className="p-3">{t.product.wholesaleFrom}</th>
              </tr>
            </thead>
            <tbody>
              {product.variants.map((v) => (
                <tr key={v.id} className="border-t border-border">
                  <td className="p-3">
                    <span className="font-bold">{locale === "km" ? v.nameKm : v.nameEn}</span>
                    <span className="block text-xs text-muted-foreground">{v.packageSize} · {v.weightGrams}g</span>
                  </td>
                  <td className="p-3 font-bold text-primary">{formatMoney(v.retailPrice, "KHR", locale)}</td>
                  <td className="p-3 text-success">{v.wholesaleFrom ? formatMoney(v.wholesaleFrom, "KHR", locale) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="max-w-sm">
            <ProductCard product={product} t={t} locale={locale} />
          </div>
        </div>
      </div>
    </div>
  );
}
