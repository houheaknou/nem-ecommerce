"use client";

import { createContext, useContext } from "react";
import { adminTexts, type AdminText } from "./admin-text";
import type { Locale } from "./dictionaries";

const Ctx = createContext<{ a: AdminText; locale: Locale }>({ a: adminTexts.km, locale: "km" });

export function AdminTextProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <Ctx.Provider value={{ a: adminTexts[locale], locale }}>{children}</Ctx.Provider>;
}

export function useAdminText() {
  return useContext(Ctx);
}
