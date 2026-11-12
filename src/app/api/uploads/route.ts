import { AuthError, requirePermission } from "@/features/auth/guard";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_UPLOAD_BYTES, storeImage } from "@/lib/storage";

/**
 * Image upload for admin forms. Multipart field "file", query ?folder=products|logos.
 * Requires product.edit (product photos) or settings.manage (logo).
 */
export async function POST(req: Request) {
  const folder = new URL(req.url).searchParams.get("folder") === "logos" ? "logos" : "products";
  try {
    const user = await requirePermission(folder === "logos" ? "settings.manage" : "product.edit");
    if (!rateLimit(`upload:${user.id}`, 30, 60_000)) return Response.json({ error: "RATE_LIMITED" }, { status: 429 });

    const len = Number(req.headers.get("content-length") ?? 0);
    if (len > MAX_UPLOAD_BYTES + 64 * 1024) return Response.json({ error: "FILE_TOO_LARGE" }, { status: 413 });

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "NO_FILE" }, { status: 400 });
    const url = await storeImage(folder, new Uint8Array(await file.arrayBuffer()));
    return Response.json({ url });
  } catch (e) {
    if (e instanceof AuthError) return Response.json({ error: e.code }, { status: e.code === "UNAUTHENTICATED" ? 401 : 403 });
    const msg = e instanceof Error ? e.message : "";
    if (msg === "FILE_TOO_LARGE" || msg === "UNSUPPORTED_FILE_TYPE") return Response.json({ error: msg }, { status: 400 });
    console.error("[upload]", e);
    return Response.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  }
}
