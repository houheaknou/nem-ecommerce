import type { Metadata } from "next";
import { CartView } from "./cart-view";
import { getI18n } from "@/i18n/server";

export const metadata: Metadata = { title: "Cart" };

export default async function CartPage() {
  const { t, locale } = await getI18n();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 font-heading text-3xl font-black">{t.nav.cart}</h1>
      <CartView locale={locale} />
    </div>
  );
}
