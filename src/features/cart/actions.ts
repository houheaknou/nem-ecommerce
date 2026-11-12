"use server";

import { currentUser } from "@/features/auth/guard";
import { rateLimit } from "@/lib/rate-limit";
import { quoteCart, type CartLineInput } from "./quote";

/** Cart preview. The client only sends (variantId, qty); prices come from here. */
export async function quoteCartAction(lines: CartLineInput[]) {
  const user = await currentUser();
  if (!rateLimit(`quote:${user?.id ?? "guest"}`, 120, 60_000)) {
    return { ok: false as const, error: "RATE_LIMITED" };
  }
  try {
    return { ok: true as const, quote: await quoteCart(lines, user?.customer?.id ?? null) };
  } catch {
    return { ok: false as const, error: "INVALID_CART" };
  }
}
