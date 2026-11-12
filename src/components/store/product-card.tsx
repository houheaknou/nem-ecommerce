"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NemIllustration } from "@/components/brand/nem-illustration";
import { useCart } from "@/features/cart/store";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { StorefrontProduct } from "@/features/catalog/queries";
import type { Dictionary, Locale } from "@/i18n/dictionaries";

export function ProductCard({ product, t, locale, index = 0 }: { product: StorefrontProduct; t: Dictionary; locale: Locale; index?: number }) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id);
  const [qty, setQty] = useState(1);
  const add = useCart((s) => s.add);
  const v = product.variants.find((x) => x.id === variantId) ?? product.variants[0];
  if (!v) return null;
  const name = locale === "km" ? product.nameKm : product.nameEn;
  const altName = locale === "km" ? product.nameEn : product.nameKm;
  const out = v.stock === "OUT";
  const discountPct =
    v.wholesaleFrom && Number(v.wholesaleFrom) < Number(v.retailPrice)
      ? Math.round((1 - Number(v.wholesaleFrom) / Number(v.retailPrice)) * 100)
      : 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      whileHover={{ y: -4 }}
      className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft"
    >
      <Link href={`/products/${product.slug}`} className="relative block aspect-[5/4] bg-gradient-to-br from-accent to-secondary">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <NemIllustration variant={index} className="p-6 transition-transform duration-300 group-hover:scale-105" />
        )}
        {discountPct > 0 && (
          <Badge className="absolute left-3 top-3 rounded-full bg-warning text-warning-foreground">
            {t.product.wholesaleFrom} −{discountPct}%
          </Badge>
        )}
        <StockPill level={v.stock} t={t} />
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-heading text-lg font-extrabold leading-snug">{name}</h3>
          <p className="text-xs text-muted-foreground">{altName}</p>
        </div>

        {product.variants.length > 1 && (
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t.product.package}>
            {product.variants.map((x) => (
              <button
                key={x.id}
                role="radio"
                aria-checked={x.id === v.id}
                onClick={() => setVariantId(x.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-semibold transition",
                  x.id === v.id ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/60",
                )}
              >
                {locale === "km" ? x.nameKm : x.nameEn}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end justify-between">
          <div>
            <p className="text-xl font-extrabold text-primary">{formatMoney(v.retailPrice, "KHR", locale)}</p>
            <p className="text-xs text-muted-foreground">
              {v.packageSize} · {v.weightGrams}g
            </p>
          </div>
          {v.wholesaleFrom && (
            <p className="text-right text-xs text-success">
              {t.product.wholesaleFrom}
              <br />
              <span className="font-bold">{formatMoney(v.wholesaleFrom, "KHR", locale)}</span>
            </p>
          )}
        </div>

        <div className="mt-auto flex items-center gap-2">
          <div className="flex items-center rounded-full border border-border">
            <Button size="icon" variant="ghost" className="size-8 rounded-full" aria-label="−" onClick={() => setQty((q) => Math.max(1, q - 1))}>
              <Minus className="size-3.5" />
            </Button>
            <input
              aria-label="Quantity"
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.min(9999, Number(e.target.value.replace(/\D/g, "")) || 1)))}
              className="w-9 bg-transparent text-center text-sm font-bold outline-none"
            />
            <Button size="icon" variant="ghost" className="size-8 rounded-full" aria-label="+" onClick={() => setQty((q) => q + 1)}>
              <Plus className="size-3.5" />
            </Button>
          </div>
          <Button
            className="flex-1 rounded-full font-bold"
            disabled={out}
            onClick={() => {
              add(v.id, qty);
              toast.success(`${name} × ${qty}`, { description: t.product.addToCart });
              setQty(1);
            }}
          >
            <ShoppingBag className="size-4" />
            {out ? t.product.outOfStock : t.product.addToCart}
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

function StockPill({ level, t }: { level: StorefrontProduct["variants"][number]["stock"]; t: Dictionary }) {
  const map = {
    IN_STOCK: ["bg-success/90 text-success-foreground", t.product.inStock],
    LOW: ["bg-warning text-warning-foreground", t.product.lowStock],
    OUT: ["bg-muted text-muted-foreground", t.product.outOfStock],
  } as const;
  const [cls, label] = map[level];
  return <span className={cn("absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-[11px] font-bold", cls)}>{label}</span>;
}
