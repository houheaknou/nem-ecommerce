"use client";

import { useCart } from "@/features/cart/store";
import { useHydrated } from "@/hooks/use-hydrated";

/** Item count; rendered after hydration because the cart lives in localStorage. */
export function CartCount() {
  const count = useCart((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const hydrated = useHydrated();
  if (!hydrated || count === 0) return null;
  return (
    <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}
