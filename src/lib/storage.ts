import "server-only";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * File storage. Uses S3-compatible object storage when S3_* env vars are set;
 * otherwise falls back to ./storage on local disk (development), served by
 * /api/files/[...key].
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
export type ImageType = keyof typeof IMAGE_TYPES;

/** Sniff the real type from magic bytes — never trust the browser's mime type. */
export function detectImageType(buf: Uint8Array): ImageType | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (
    buf.length >= 12 &&
    String.fromCharCode(...buf.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...buf.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

const LOCAL_ROOT = path.resolve(process.cwd(), "storage");

function s3() {
  const { S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET } = process.env;
  if (!S3_BUCKET || !S3_ACCESS_KEY || !S3_SECRET_KEY) return null;
  return {
    bucket: S3_BUCKET,
    publicUrl: (process.env.S3_PUBLIC_URL ?? "").replace(/\/$/, ""),
    client: new S3Client({
      region: S3_REGION ?? "us-east-1",
      endpoint: S3_ENDPOINT || undefined,
      forcePathStyle: !!S3_ENDPOINT,
      credentials: { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET_KEY },
    }),
  };
}

/** Stores a validated image and returns its public URL. */
export async function storeImage(folder: "products" | "receipts" | "logos" | "deliveries", bytes: Uint8Array) {
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw new Error("FILE_TOO_LARGE");
  const type = detectImageType(bytes);
  if (!type) throw new Error("UNSUPPORTED_FILE_TYPE");
  const now = new Date();
  const key = `${folder}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${IMAGE_TYPES[type]}`;

  const remote = s3();
  if (remote) {
    await remote.client.send(
      new PutObjectCommand({ Bucket: remote.bucket, Key: key, Body: bytes, ContentType: type, CacheControl: "public, max-age=31536000, immutable" }),
    );
    return `${remote.publicUrl}/${key}`;
  }

  const file = path.join(LOCAL_ROOT, key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes);
  return `/api/files/${key}`;
}

/** Resolve a local storage key safely (no path traversal). */
export function localFilePath(keyParts: string[]): string | null {
  const resolved = path.resolve(LOCAL_ROOT, ...keyParts);
  if (!resolved.startsWith(LOCAL_ROOT + path.sep)) return null;
  return resolved;
}

export const CONTENT_TYPE_BY_EXT: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
