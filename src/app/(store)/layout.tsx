import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { MobileBottomNav } from "@/components/store/mobile-nav";
import { getI18n } from "@/i18n/server";
import { currentUser } from "@/features/auth/guard";
import { isStaff } from "@/features/auth/permissions";
import { getSetting } from "@/features/settings/queries";

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const [{ t, locale }, user, phone, facebook, telegram] = await Promise.all([
    getI18n(),
    currentUser(),
    getSetting("business.phone", ""),
    getSetting("business.facebook", "https://facebook.com/"),
    getSetting("business.telegram", "https://t.me/"),
  ]);
  return (
    <>
      <StoreHeader t={t} locale={locale} signedIn={!!user} isStaff={!!user && isStaff(user.roleCodes)} />
      <main className="flex-1">{children}</main>
      <StoreFooter t={t} phone={phone} facebook={facebook} telegram={telegram} />
      <MobileBottomNav
        signedIn={!!user}
        labels={{ home: t.nav.home, products: t.nav.products, wholesale: t.nav.wholesale, cart: t.nav.cart, account: t.nav.account }}
      />
    </>
  );
}
