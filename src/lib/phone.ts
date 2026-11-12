/**
 * Cambodian phone normalisation for storage and duplicate detection.
 * "+855 12 345 678", "855-12-345-678", "012 345 678" -> "012345678".
 */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("855")) digits = `0${digits.slice(3)}`;
  if (digits.length > 0 && !digits.startsWith("0")) digits = `0${digits}`;
  return digits;
}

/** Cambodian numbers are 9–10 digits including the leading 0. */
export function isValidKhPhone(raw: string): boolean {
  return /^0\d{8,9}$/.test(normalizePhone(raw));
}

/** "012345678" -> "012 345 678", "0961234567" -> "096 123 4567" */
export function formatPhone(raw: string): string {
  const d = normalizePhone(raw);
  if (d.length === 9) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  if (d.length === 10) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  return raw.trim();
}

/** Substring to match against phoneNormalized when searching ("+855 12 3" -> "123"). */
export function phoneSearchFragment(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^855/, "").replace(/^0/, "");
}
