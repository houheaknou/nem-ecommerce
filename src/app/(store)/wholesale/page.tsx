import type { Metadata } from "next";
import Link from "next/link";
import { BadgePercent, Store, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { currentUser } from "@/features/auth/guard";
import { getTiersByVariant, listPricingVariants } from "@/features/pricing/queries";
import { getI18n } from "@/i18n/server";
import { formatMoney } from "@/lib/money";
import { WholesaleApplyForm } from "./apply-form";

export const metadata: Metadata = { title: "Wholesale" };

export default async function WholesalePage() {
  const [{ a, t, locale }, user, variants, tiers] = await Promise.all([getI18n(), currentUser(), listPricingVariants(), getTiersByVariant(null)]);
  const status = user?.customer?.wholesaleStatus;
  const priced = variants.filter((v) => v.isActive && tiers[v.id]?.length);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 rounded-3xl bg-success/10 p-7">
        <Store className="mb-3 size-9 text-success" />
        <h1 className="font-heading text-3xl font-black">{t.home.wholesaleTitle}</h1>
        <p className="mt-2 max-w-xl text-foreground/80">{a.account.wholesaleIntro}</p>
      </div>

      {priced.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 font-heading text-xl font-black"><BadgePercent className="size-5 text-primary" />{a.pricing.wholesaleTiers}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {priced.map((v) => (
              <div key={v.id} className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
                <p className="bg-secondary px-4 py-2 font-bold">{locale === "km" ? v.labelKm : v.labelEn}</p>
                <table className="w-full text-sm">
                  <tbody>
                    {tiers[v.id].map((tier) => (
                      <tr key={tier.minQty} className="border-t border-border">
                        <td className="px-4 py-2">{tier.minQty}{tier.maxQty ? `–${tier.maxQty}` : "+"}</td>
                        <td className="px-4 py-2 text-right font-bold text-success">{formatMoney(tier.unitPrice, "KHR", locale)}{t.product.perPack}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        <h2 className="mb-4 flex items-center gap-2 font-heading text-xl font-black"><Truck className="size-5 text-primary" />{a.account.applyWholesale}</h2>
        {!user ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{a.account.loginToApply}</p>
            <div className="flex gap-2">
              <Button asChild className="rounded-full"><Link href="/register">{a.account.register}</Link></Button>
              <Button asChild variant="outline" className="rounded-full"><Link href="/login?callbackUrl=/wholesale">{t.nav.login}</Link></Button>
            </div>
          </div>
        ) : !user.customer ? (
          <p className="text-sm text-muted-foreground">—</p>
        ) : status === "APPROVED" ? (
          <p className="font-semibold text-success">{a.account.wholesaleApproved}</p>
        ) : status === "PENDING" ? (
          <p className="font-semibold">{a.account.wholesalePending}</p>
        ) : (
          <>
            {status === "REJECTED" && <p className="mb-3 text-sm text-muted-foreground">{a.account.wholesaleRejected}</p>}
            <WholesaleApplyForm />
          </>
        )}
      </section>
    </div>
  );
}
