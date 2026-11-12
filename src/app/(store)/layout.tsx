import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { MobileBottomNav } from "@/components/store/mobile-nav";
import { getI18n } from "@/i18n/server";
import { AdminTextProvider } from "@/i18n/admin-text-context";
import { currentUser } from "@/features/auth/guard";
import { isStaff } from "@/features/auth/permissions";
import { brandNames, getBranding } from "@/features/settings/branding";

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const [{ t, locale }, user, b] = await Promise.all([getI18n(), currentUser(), getBranding()]);
  const brand = { ...brandNames(b, locale), logoUrl: b.logoUrl };
  const tagline = locale === "km" ? b.taglineKm : b.taglineEn;
  return (
    <>
      <StoreHeader t={t} locale={locale} brand={brand} signedIn={!!user} isStaff={!!user && isStaff(user.roleCodes)} />
      <main className="flex-1">
        <AdminTextProvider locale={locale}>{children}</AdminTextProvider>
      </main>
      <StoreFooter t={t} brand={brand} tagline={tagline} phone={b.phone} facebook={b.facebook} telegram={b.telegram} />
      <MobileBottomNav
        signedIn={!!user}
        labels={{ home: t.nav.home, products: t.nav.products, wholesale: t.nav.wholesale, cart: t.nav.cart, account: t.nav.account }}
      />
    </>
  );
}
