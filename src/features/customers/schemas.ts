import { z } from "zod";
import { isValidKhPhone } from "@/lib/phone";

const phone = z.string().trim().refine(isValidKhPhone, "invalidPhone");
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const ORDER_SOURCES = ["WEBSITE", "FACEBOOK", "TELEGRAM", "PHONE", "WALK_IN", "ADMIN"] as const;

export const customerSchema = z.object({
  id: z.uuid().optional(),
  fullName: z.string().trim().min(2).max(120),
  phone,
  email: z.email().optional().or(z.literal("")),
  type: z.enum(["RETAIL", "WHOLESALE"]),
  businessName: optionalText(160),
  contactPerson: optionalText(120),
  creditLimit: z.number().min(0).max(1_000_000_000),
  acquisitionSource: z.enum(ORDER_SOURCES),
  notes: optionalText(2000),
  /** Set true after the user saw the duplicate-phone warning and chose to continue. */
  allowDuplicatePhone: z.boolean().optional(),
});
export type CustomerInput = z.infer<typeof customerSchema>;

export const addressSchema = z.object({
  id: z.uuid().optional(),
  label: optionalText(40),
  recipientName: z.string().trim().min(2).max(120),
  phone,
  provinceId: z.number().int().positive(),
  districtId: z.number().int().positive().nullable(),
  street: optionalText(300),
  deliveryNotes: optionalText(500),
  isDefault: z.boolean(),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const wholesaleApplicationSchema = z.object({
  businessName: z.string().trim().min(2).max(160),
  businessType: optionalText(80),
  expectedMonthlyPacks: z.number().int().min(0).max(1_000_000).nullable(),
});
export type WholesaleApplicationInput = z.infer<typeof wholesaleApplicationSchema>;
