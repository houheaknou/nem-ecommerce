import { describe, expect, it } from "vitest";
import { formatPhone, isValidKhPhone, normalizePhone, phoneSearchFragment } from "./phone";

describe("phone normalisation (duplicate detection)", () => {
  it.each([
    ["012 345 678", "012345678"],
    ["+855 12 345 678", "012345678"],
    ["855-12-345-678", "012345678"],
    ["(012) 345-678", "012345678"],
    ["12345678", "012345678"],
    ["096 123 4567", "0961234567"],
  ])("%s -> %s", (raw, out) => {
    expect(normalizePhone(raw)).toBe(out);
  });

  it("treats differently formatted numbers as the same customer", () => {
    expect(normalizePhone("+855 12 345 678")).toBe(normalizePhone("012-345-678"));
  });

  it("validates Cambodian lengths", () => {
    expect(isValidKhPhone("012 345 678")).toBe(true);
    expect(isValidKhPhone("096 123 4567")).toBe(true);
    expect(isValidKhPhone("12345")).toBe(false);
    expect(isValidKhPhone("012 345 678 999")).toBe(false);
  });

  it("formats for display", () => {
    expect(formatPhone("+85512345678")).toBe("012 345 678");
  });
});

describe("phone search", () => {
  it("matches regardless of country code or leading zero", () => {
    expect(phoneSearchFragment("+855 12 3")).toBe("123");
    expect(phoneSearchFragment("012 3")).toBe("123");
    expect("012345678".includes(phoneSearchFragment("+85512345"))).toBe(true);
  });
});
