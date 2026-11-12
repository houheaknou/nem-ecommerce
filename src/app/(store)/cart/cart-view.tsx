"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NemIllustration } from "@/components/brand/nem-illustration";
import { useCart } from "@/features/cart/store";
import { quoteCartAction } from "@/features/cart/actions";
import { formatMoney } from "@/lib/money";
import { useHydrated } from "@/hooks/use-hydrated";
import type { Locale } from "@/i18n/dictionaries";

type Quote = Extract<Awaited<ReturnType<typeof quoteCartAction>>, { ok: true }>["quote"];

const L = {
  km: { empty: "កន្ត្រករបស់អ្នកនៅទទេ", browse: "មើលផលិតផល", subtotal: "សរុបរង", saved: "សន្សំបាន", checkout: "បន្តទៅទូទាត់", note: "តម្លៃដឹកជញ្ជូនគណនានៅពេលទូទាត់", soon: "ការទូទាត់នឹងបើកនៅដំណាក់កាលទី ៣", wholesale: "តម្លៃលក់ដុំ", promo: "ប្រូម៉ូសិន", customer: "តម្លៃពិសេស", error: "មិនអាចគណនាតម្លៃបានទេ" },
  en: { empty: "Your cart is empty", browse: "Browse products", subtotal: "Subtotal", saved: "You save", checkout: "Continue to checkout", note: "Delivery fee is calculated at checkout", soon: "Checkout opens in Phase 3", wholesale: "Wholesale price", promo: "Promotion", customer: "Your special price", error: "Could not price the cart" },
} as const;

export function CartView({ locale }: { locale: Locale }) {
  const l = L[locale];
  const { items, setQty, remove } = useCart();
  const mounted = useHydrated();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!mounted || items.length === 0) return;
    // Re-price on the server whenever the cart changes.
    start(async () => {
      const res = await quoteCartAction(items);
      setError(!res.ok);
      if (res.ok) {
        setQuote(res.quote);
        // drop lines for products that no longer exist / are inactive
        res.quote.missing.forEach((id) => remove(id));
      }
    });
  }, [items, mounted, remove]);

  if (!mounted) return <Skeleton className="h-40 w-full rounded-3xl" />;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border p-10 text-center">
        <NemIllustration className="h-32 w-40" />
        <p className="font-bold">{l.empty}</p>
        <Button asChild className="rounded-full"><Link href="/products">{l.browse}</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">{l.error}</p>}
      <ul className="space-y-3">
        {items.map((item) => {
          const line = quote?.lines.find((x) => x.variantId === item.variantId);
          return (
            <li key={item.variantId} className="flex items-center gap-3 rounded-3xl border border-border bg-card p-3 shadow-soft">
              <div className="size-16 shrink-0 rounded-2xl bg-accent p-1"><NemIllustration /></div>
              <div className="min-w-0 flex-1">
                {line ? (
                  <>
                    <p className="truncate font-bold">{locale === "km" ? line.productNameKm : line.productNameEn}</p>
                    <p className="text-xs text-muted-foreground">{locale === "km" ? line.nameKm : line.nameEn}</p>
                    <p className="text-sm">
                      {formatMoney(line.unitPrice, "KHR", locale)}
                      {line.source !== "RETAIL" && (
                        <span className="ml-2 rounded-full bg-success/15 px-2 text-[11px] font-bold text-success">
                          {line.source === "WHOLESALE_TIER" ? l.wholesale : line.source === "PROMO" ? l.promo : l.customer}
                        </span>
                      )}
                    </p>
                  </>
                ) : (
                  <Skeleton className="h-10 w-40" />
                )}
              </div>
              <div className="flex items-center rounded-full border border-border">
                <Button size="icon" variant="ghost" className="size-8 rounded-full" aria-label="−" onClick={() => setQty(item.variantId, item.quantity - 1)}><Minus className="size-3.5" /></Button>
                <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                <Button size="icon" variant="ghost" className="size-8 rounded-full" aria-label="+" onClick={() => setQty(item.variantId, item.quantity + 1)}><Plus className="size-3.5" /></Button>
              </div>
              <Button size="icon" variant="ghost" className="rounded-full text-muted-foreground" aria-label="Remove" onClick={() => remove(item.variantId)}>
                <Trash2 className="size-4" />
              </Button>
            </li>
          );
        })}
      </ul>

      <div className="space-y-2 rounded-3xl bg-secondary p-5">
        <div className="flex justify-between font-bold">
          <span>{l.subtotal}</span>
          <span className={pending ? "opacity-50" : ""}>{quote ? formatMoney(quote.subtotal, "KHR", locale) : "…"}</span>
        </div>
        {quote && Number(quote.discountTotal) > 0 && (
          <div className="flex justify-between text-sm text-success">
            <span>{l.saved}</span>
            <span>−{formatMoney(quote.discountTotal, "KHR", locale)}</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground">{l.note}</p>
        <Button className="w-full rounded-full font-bold" size="lg" disabled title={l.soon}>
          <ShoppingBag className="size-4" /> {l.checkout}
        </Button>
        <p className="text-center text-xs text-muted-foreground">{l.soon}</p>
      </div>
    </div>
  );
}
