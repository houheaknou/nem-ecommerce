import "server-only";
import { headers } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { db, type Tx } from "@/lib/db";

/** JSON-safe copy (Decimal/Date -> string) for audit snapshots. */
function snapshot(v: unknown): Prisma.InputJsonValue | undefined {
  if (v === undefined || v === null) return undefined;
  return JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
}

/**
 * Append-only audit trail. Pass the transaction client so the log row commits
 * (or rolls back) together with the change it describes.
 */
export async function audit(
  client: Tx | typeof db,
  entry: {
    userId: string | null;
    action: string; // e.g. "product.update"
    entityType: string;
    entityId: string;
    before?: unknown;
    after?: unknown;
  },
) {
  let ip: string | null = null;
  try {
    const h = await headers();
    ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  } catch {
    // outside a request (seed / scripts)
  }
  await client.auditLog.create({
    data: {
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: snapshot(entry.before),
      after: snapshot(entry.after),
      ip,
    },
  });
}
