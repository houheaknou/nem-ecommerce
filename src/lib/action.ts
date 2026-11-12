import "server-only";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { AuthError } from "@/features/auth/guard";
import { PricingError } from "@/features/pricing/domain/pricing";

/**
 * Uniform result for every server action, so forms can show field errors and
 * toasts without try/catch boilerplate in each component.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** A business-rule failure whose message is safe to show the user. */
export class UserError extends Error {}

export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof z.ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of e.issues) {
        const key = issue.path.join(".") || "_";
        (fieldErrors[key] ??= []).push(issue.message);
      }
      return { ok: false, error: "VALIDATION", fieldErrors };
    }
    if (e instanceof AuthError) return { ok: false, error: e.code };
    if (e instanceof UserError || e instanceof PricingError) return { ok: false, error: e.message };
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        const target = (e.meta?.target as string[] | string | undefined) ?? "";
        return { ok: false, error: `DUPLICATE:${Array.isArray(target) ? target.join(",") : target}` };
      }
      if (e.code === "P2003") return { ok: false, error: "IN_USE" };
      if (e.code === "P2025") return { ok: false, error: "NOT_FOUND" };
    }
    // Rethrow Next.js control-flow errors (redirect / notFound).
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) {
      throw e;
    }
    console.error("[action]", e);
    return { ok: false, error: "UNEXPECTED" };
  }
}
