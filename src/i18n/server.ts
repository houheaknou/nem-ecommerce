import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, dictionaries, LOCALES, type Locale } from "./dictionaries";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get("locale")?.value;
  return (LOCALES as readonly string[]).includes(value ?? "") ? (value as Locale) : DEFAULT_LOCALE;
}

export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}

/** Pick the Khmer or English field of a bilingual record. */
export function pick<T extends { nameKm: string; nameEn: string }>(row: T, locale: Locale): string {
  return locale === "km" ? row.nameKm : row.nameEn;
}
