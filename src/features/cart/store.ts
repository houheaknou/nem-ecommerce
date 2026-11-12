"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Client cart holds ONLY ids and quantities — never prices. */
export interface CartItem {
  variantId: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  add: (variantId: string, quantity: number) => void;
  setQty: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (variantId, quantity) =>
        set((s) => {
          const existing = s.items.find((i) => i.variantId === variantId);
          return {
            items: existing
              ? s.items.map((i) => (i.variantId === variantId ? { ...i, quantity: i.quantity + quantity } : i))
              : [...s.items, { variantId, quantity }],
          };
        }),
      setQty: (variantId, quantity) =>
        set((s) => ({
          items: s.items.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.max(1, quantity) } : i)),
        })),
      remove: (variantId) => set((s) => ({ items: s.items.filter((i) => i.variantId !== variantId) })),
      clear: () => set({ items: [] }),
    }),
    { name: "nem-cart" },
  ),
);
