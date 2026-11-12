"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, ShoppingBag, Store, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { CartCount } from "./cart-badge";

export function MobileBottomNav({ labels, signedIn }: { labels: { home: string; products: string; wholesale: string; cart: string; account: string }; signedIn: boolean }) {
  const path = usePathname();
  const items = [
    { href: "/", label: labels.home, icon: Home },
    { href: "/products", label: labels.products, icon: Package },
    { href: "/cart", label: labels.cart, icon: ShoppingBag, badge: true },
    { href: "/wholesale", label: labels.wholesale, icon: Store },
    { href: signedIn ? "/account" : "/login", label: labels.account, icon: User },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon, badge }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", active ? "text-primary" : "text-muted-foreground")}>
                <span className={cn("relative grid size-8 place-items-center rounded-full transition", active && "bg-accent")}>
                  <Icon className="size-5" />
                  {badge && <CartCount />}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
