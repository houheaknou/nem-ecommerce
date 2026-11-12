import Decimal from "decimal.js";

/** All money math goes through Decimal — never JS floats. */
export type MoneyInput = Decimal.Value | { toString(): string };

export const D = (v: MoneyInput): Decimal =>
  v instanceof Decimal ? v : new Decimal(typeof v === "object" ? v.toString() : v);

export const ZERO = new Decimal(0);

/** Round to the currency's minor unit (KHR: 0 decimals, USD: 2). */
export function roundMoney(v: MoneyInput, currency = "KHR"): Decimal {
  const decimals = currency === "KHR" ? 0 : 2;
  return D(v).toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP);
}

export function sum(values: MoneyInput[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(D(v)), ZERO);
}

export function formatMoney(v: MoneyInput, currency = "KHR", locale = "km"): string {
  const n = D(v).toNumber();
  if (currency === "KHR") {
    return `${new Intl.NumberFormat(locale === "km" ? "km-KH" : "en-US").format(Math.round(n))} ៛`;
  }
  return new Intl.NumberFormat(locale === "km" ? "km-KH" : "en-US", {
    style: "currency",
    currency,
  }).format(n);
}
