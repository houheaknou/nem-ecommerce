import { z } from "zod";
import { STAFF_ROLES } from "@/features/auth/permissions";

export const staffUserSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2).max(120),
  email: z.email().max(160),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  /** Required for new users; blank on edit keeps the current password. */
  password: z.string().max(200).optional().or(z.literal("")),
  roles: z.array(z.enum(STAFF_ROLES as [string, ...string[]])).min(1),
  isActive: z.boolean(),
});
export type StaffUserInput = z.infer<typeof staffUserSchema>;
