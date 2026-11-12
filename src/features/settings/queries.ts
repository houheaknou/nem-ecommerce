import "server-only";
import { db } from "@/lib/db";

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.systemSetting.findUnique({ where: { key } });
  return (row?.value as T | undefined) ?? fallback;
}

export async function getNumberSetting(key: string, fallback: number): Promise<number> {
  const v = await getSetting<unknown>(key, fallback);
  return typeof v === "number" ? v : Number(v) || fallback;
}
