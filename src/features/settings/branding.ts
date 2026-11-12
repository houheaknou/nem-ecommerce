import "server-only";
import { cache } from "react";
import { getSetting } from "./queries";
import type { Locale } from "@/i18n/dictionaries";

/**
 * Store identity comes from system_settings, not from code, so the business
 * can be renamed (or the platform reused for another shop) without a deploy.
 * Keys: business.name {km,en}, business.tagline {km,en}, business.logoUrl,
 * business.phone, business.facebook, business.telegram.
 */
export interface Branding {
  nameKm: string;
  nameEn: string;
  taglineKm: string;
  taglineEn: string;
  logoUrl: string | null;
  phone: string;
  facebook: string;
  telegram: string;
}

type Bilingual = { km?: string; en?: string };

const FALLBACK = { km: "ហាងអនឡាញ", en: "Online Shop" };

export const getBranding = cache(async (): Promise<Branding> => {
  const [name, tagline, logoUrl, phone, facebook, telegram] = await Promise.all([
    getSetting<Bilingual>("business.name", FALLBACK),
    getSetting<Bilingual>("business.tagline", {}),
    getSetting<string | null>("business.logoUrl", null),
    getSetting("business.phone", ""),
    getSetting("business.facebook", ""),
    getSetting("business.telegram", ""),
  ]);
  const nameKm = name.km || name.en || FALLBACK.km;
  const nameEn = name.en || name.km || FALLBACK.en;
  return {
    nameKm,
    nameEn,
    taglineKm: tagline.km ?? "",
    taglineEn: tagline.en ?? "",
    logoUrl,
    phone,
    facebook,
    telegram,
  };
});

/** Primary name in the active language, secondary name in the other one. */
export function brandNames(b: Branding, locale: Locale) {
  return locale === "km" ? { title: b.nameKm, sub: b.nameEn } : { title: b.nameEn, sub: b.nameKm };
}

/** Replace `{brand}` placeholders in dictionary strings. */
export function withBrand(text: string, b: Branding, locale: Locale) {
  return text.replaceAll("{brand}", brandNames(b, locale).title);
}
