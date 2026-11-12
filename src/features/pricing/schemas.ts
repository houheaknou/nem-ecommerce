import { z } from "zod";

export const tierSchema = z.object({
  minQty: z.number().int().min(1).max(1_000_000),
  maxQty: z.number().int().min(1).max(1_000_000).nullable(),
  unitPrice: z.number().finite().positive().max(1_000_000_000),
});
export type TierInput = z.infer<typeof tierSchema>;

export const variantTiersSchema = z.object({
  priceListId: z.uuid().optional(), // omitted = default wholesale list
  variantId: z.uuid(),
  tiers: z.array(tierSchema).max(20),
});

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .or(z.literal(""));

export const priceListSchema = z
  .object({
    id: z.uuid().optional(),
    name: z.string().trim().min(2).max(120),
    validFrom: dateStr,
    validTo: dateStr,
    isActive: z.boolean(),
  })
  .refine((v) => !v.validFrom || !v.validTo || v.validFrom <= v.validTo, { message: "validTo < validFrom", path: ["validTo"] });
export type PriceListInput = z.infer<typeof priceListSchema>;

export const promotionSchema = z
  .object({
    id: z.uuid().optional(),
    name: z.string().trim().min(2).max(120),
    variantId: z.uuid().nullable(),
    percentOff: z.number().min(0).max(100).nullable(),
    amountOff: z.number().min(0).max(1_000_000_000).nullable(),
    appliesTo: z.enum(["RETAIL", "WHOLESALE"]).nullable(),
    validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    isActive: z.boolean(),
  })
  .refine((p) => (p.percentOff ?? 0) > 0 || (p.amountOff ?? 0) > 0, { message: "% or amount", path: ["percentOff"] })
  .refine((p) => p.validFrom <= p.validTo, { message: "validTo < validFrom", path: ["validTo"] });
export type PromotionInput = z.infer<typeof promotionSchema>;

/** "2026-11-12" -> start of that day (UTC); end dates -> end of day. */
export function parseDay(s: string | undefined, endOfDay = false): Date | null {
  if (!s) return null;
  return new Date(`${s}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
}
