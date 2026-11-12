import { z } from "zod";
import { isValidKhPhone } from "@/lib/phone";

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    phone: z.string().trim().refine(isValidKhPhone, "invalidPhone"),
    email: z.email().max(160),
    password: z.string().min(10).max(200),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { message: "passwordMismatch", path: ["confirmPassword"] });
export type RegisterInput = z.infer<typeof registerSchema>;

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().refine(isValidKhPhone, "invalidPhone"),
});
export type ProfileInput = z.infer<typeof profileSchema>;
