import Link from "next/link";
import { ArrowRight, Leaf, MapPin, PackageCheck, ShoppingBasket, Store, Truck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NemIllustration } from "@/components/brand/nem-illustration";
import { ProductCard } from "@/components/store/product-card";
import { listStorefrontProducts } from "@/features/catalog/queries";
import { getI18n } from "@/i18n/server";
import { getBranding, withBrand } from "@/features/settings/branding";

export default async function HomePage() {
  const [{ t, locale }, products, brand] = await Promise.all([getI18n(), listStorefrontProducts(), getBranding()]);
  const tagline = locale === "km" ? brand.taglineKm : brand.taglineEn;
  const featured = products.slice(0, 4);
  const stepIcons = [ShoppingBasket, MapPin, Wallet, PackageCheck];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-dots">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 md:grid-cols-2 md:py-20">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
              <Leaf className="size-3.5" /> {t.home.heroBadge}
            </span>
            <h1 className="font-heading text-4xl font-black leading-tight text-foreground md:text-5xl">
              {withBrand(t.home.heroTitle, brand, locale)}
            </h1>
            <p className="max-w-md text-base text-muted-foreground">{tagline || t.home.heroText}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full px-6 font-bold shadow-soft">
                <Link href="/products">
                  {t.home.shopNow} <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-6 font-bold">
                <Link href="/wholesale">{t.home.becomeWholesale}</Link>
              </Button>
            </div>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-md">
            <div className="absolute inset-6 rounded-[3rem] bg-gradient-to-br from-accent via-secondary to-warning/40 rotate-3" />
            <div className="absolute inset-6 rounded-[3rem] border-2 border-dashed border-primary/30 -rotate-3" />
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logoUrl} alt={locale === "km" ? brand.nameKm : brand.nameEn} className="relative size-full object-contain p-4 drop-shadow-xl" />
            ) : (
              <NemIllustration className="relative p-10 drop-shadow-xl" />
            )}
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-heading text-2xl font-black">{t.home.featured}</h2>
          <Link href="/products" className="text-sm font-bold text-primary hover:underline">
            {t.common.viewAll} →
          </Link>
        </div>
        {featured.length === 0 ? (
          <p className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground">{t.product.empty}</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p, i) => (
              <ProductCard key={p.id} product={p} t={t} locale={locale} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* Retail vs wholesale */}
      <section className="mx-auto grid max-w-6xl gap-5 px-4 md:grid-cols-2">
        <div className="rounded-3xl bg-accent p-7">
          <ShoppingBasket className="mb-3 size-8 text-primary" />
          <h3 className="font-heading text-xl font-black">{t.home.retailTitle}</h3>
          <p className="mt-1 text-sm text-foreground/80">{t.home.retailText}</p>
        </div>
        <div className="rounded-3xl bg-success/15 p-7">
          <Store className="mb-3 size-8 text-success" />
          <h3 className="font-heading text-xl font-black">{t.home.wholesaleTitle}</h3>
          <p className="mt-1 text-sm text-foreground/80">{t.home.wholesaleText}</p>
          <Link href="/wholesale" className="mt-3 inline-block text-sm font-bold text-success hover:underline">
            {t.home.becomeWholesale} →
          </Link>
        </div>
      </section>

      {/* How to order */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="mb-6 font-heading text-2xl font-black">{t.home.howToOrder}</h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.home.steps.map((s, i) => {
            const Icon = stepIcons[i];
            return (
              <li key={s} className="flex items-center gap-3 rounded-3xl border border-border bg-card p-4 shadow-soft">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block text-xs font-bold text-muted-foreground">0{i + 1}</span>
                  <span className="font-bold">{s}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Delivery */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-start gap-4 rounded-3xl bg-secondary p-7 sm:flex-row sm:items-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-warning/30 text-warning-foreground">
            <Truck className="size-7" />
          </span>
          <div>
            <h3 className="font-heading text-xl font-black">{t.home.deliveryTitle}</h3>
            <p className="text-sm text-foreground/80">{t.home.deliveryText}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
