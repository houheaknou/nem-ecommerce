import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { detectImageType, localFilePath } = await import("./storage");

describe("safe file uploads", () => {
  it("detects real image types from magic bytes", () => {
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");
    expect(detectImageType(webp)).toBe("image/webp");
  });

  it("rejects disguised files (e.g. HTML or SVG renamed to .jpg)", () => {
    expect(detectImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(detectImageType(new TextEncoder().encode("<!doctype html>"))).toBeNull();
  });

  it("blocks path traversal when serving local files", () => {
    expect(localFilePath(["..", "..", ".env"])).toBeNull();
    expect(localFilePath(["products", "2026", "11", "a.jpg"])).not.toBeNull();
  });
});
