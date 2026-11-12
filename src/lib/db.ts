import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

/** Single Prisma client per server process (survives dev hot reload). */
export const db = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/** Next simple code, e.g. nextCode(tx, "CUSTOMER", "CUS") -> "CUS-00042". */
export async function nextCode(tx: Tx, key: string, prefix: string, pad = 5): Promise<string> {
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO sequences (key, value) VALUES (${key}, 1)
    ON CONFLICT (key) DO UPDATE SET value = sequences.value + 1
    RETURNING value`;
  return `${prefix}-${String(rows[0].value).padStart(pad, "0")}`;
}

/**
 * Next document number, e.g. nextNumber(tx, "ORDER", "NB") -> "NB-2611-00042".
 * The UPDATE ... RETURNING row-locks the counter, so concurrent checkouts
 * inside transactions never receive the same number.
 */
export async function nextNumber(tx: Tx, key: string, prefix: string): Promise<string> {
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO sequences (key, value) VALUES (${key}, 1)
    ON CONFLICT (key) DO UPDATE SET value = sequences.value + 1
    RETURNING value`;
  const n = rows[0].value;
  const now = new Date();
  const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `${prefix}-${yymm}-${String(n).padStart(5, "0")}`;
}
