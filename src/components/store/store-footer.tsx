import Link from "next/link";
import { Phone, Send } from "lucide-react";

// Lucide 1.x dropped brand icons; minimal Facebook "f" mark.
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v7h4v-7h3l.5-4h-3.5V8.8c0-.5.3-.8.5-.8Z" />
    </svg>
  );
}
import { Logo } from "@/components/brand/nem-illustration";
import type { Dictionary } from "@/i18n/dictionaries";

export function StoreFooter({ t, phone, facebook, telegram }: { t: Dictionary; phone: string; facebook: string; telegram: string }) {
  return (
    <footer className="mt-16 border-t border-border bg-secondary/60 pb-24 md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div className="space-y-3">
          <Logo title={t.brand} sub={t.brandSub} />
          <p className="text-sm text-muted-foreground">{t.home.heroText}</p>
        </div>
        <nav className="grid gap-2 text-sm">
          <Link href="/products" className="hover:text-primary">{t.nav.products}</Link>
          <Link href="/wholesale" className="hover:text-primary">{t.nav.wholesale}</Link>
          <Link href="/about" className="hover:text-primary">{t.nav.about}</Link>
          <Link href="/privacy" className="hover:text-primary">Privacy &amp; Terms</Link>
        </nav>
        <div className="grid gap-2 text-sm">
          <span className="font-bold">{t.home.contactUs}</span>
          <a href={`tel:${phone.replace(/\s/g, "")}`} className="flex items-center gap-2 hover:text-primary"><Phone className="size-4" />{phone}</a>
          <a href={facebook} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-primary"><FacebookIcon className="size-4" />Facebook</a>
          <a href={telegram} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-primary"><Send className="size-4" />Telegram</a>
        </div>
      </div>
      <p className="pb-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} {t.brand}</p>
    </footer>
  );
}
