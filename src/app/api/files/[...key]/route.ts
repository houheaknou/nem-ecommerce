import fs from "node:fs/promises";
import path from "node:path";
import { CONTENT_TYPE_BY_EXT, localFilePath } from "@/lib/storage";

/** Serves locally stored uploads (only used when S3 is not configured). */
export async function GET(_req: Request, ctx: RouteContext<"/api/files/[...key]">) {
  const { key } = await ctx.params;
  const file = localFilePath(key);
  const type = file ? CONTENT_TYPE_BY_EXT[path.extname(file).slice(1).toLowerCase()] : undefined;
  if (!file || !type) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(file);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
