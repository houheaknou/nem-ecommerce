import Link from "next/link";
import { ShoppingBag, User } from "lucide-react";
import { Logo, type BrandProps } from "@/components/brand/nem-illustration";
import { LocaleSwitcher, ThemeToggle } from "@/components/common/preferences";
import { CartCount } from "./cart-badge";
import type { Dictionary, Locale } from "@/i18n/dictionaries";

export function StoreHeader({ t, locale, brand, isStaff, signedIn }: { t: Dictionary; locale: Locale; brand: BrandProps; isStaff: boolean; signedIn: boolean }) {
  const links = [
    { href: "/", label: t.nav.home },
    { href: "/products", label: t.nav.products },
    { href: "/wholesale", label: t.nav.wholesale },
    { href: "/about", label: t.nav.about },
    { href: "/contact", label: t.nav.contact },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link href="/" aria-label={t.nav.home}>
          <Logo {...brand} />
        </Link>
        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-full px-3 py-1.5 text-sm font-semibold text-foreground/80 transition hover:bg-accent hover:text-accent-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <LocaleSwitcher locale={locale} />
          <ThemeToggle />
          {isStaff && (
            <Link href="/admin" className="hidden rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold sm:block">
              {t.nav.admin}
            </Link>
          )}
          <Link href={signedIn ? "/account" : "/login"} aria-label={t.nav.account} className="hidden size-9 place-items-center rounded-full hover:bg-accent md:grid">
            <User className="size-5" />
          </Link>
          <Link href="/cart" aria-label={t.nav.cart} className="relative grid size-9 place-items-center rounded-full bg-primary/10 text-primary hover:bg-primary/20">
            <ShoppingBag className="size-5" />
            <CartCount />
          </Link>
        </div>
      </div>
    </header>
  );
}
