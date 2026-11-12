"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/admin/field";
import { registerAction } from "@/features/account/actions";
import { registerSchema, type RegisterInput } from "@/features/account/schemas";
import { errorMessage } from "@/i18n/admin-text";
import { useAdminText } from "@/i18n/admin-text-context";

export function RegisterForm() {
  const { a } = useAdminText();
  const [pending, start] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", phone: "", email: "", password: "", confirmPassword: "" },
  });
  const msg = (m?: string) =>
    !m ? undefined : m === "invalidPhone" ? a.errors.invalidPhone : m === "passwordMismatch" ? a.account.passwordMismatch : m.toLowerCase().includes("email") ? a.errors.invalidEmail : m;

  return (
    <form
      onSubmit={handleSubmit((v) =>
        start(async () => {
          const r = await registerAction(v); // redirects to /account on success
          if (r && !r.ok) toast.error(errorMessage(r.error, a));
        }),
      )}
      className="w-full space-y-4 rounded-3xl border border-border bg-card p-6 shadow-soft"
    >
      <Field label={a.customers.fullName} error={errors.fullName && a.errors.required}>
        <Input autoComplete="name" className="h-11 rounded-xl" {...register("fullName")} />
      </Field>
      <Field label={a.customers.phone} error={msg(errors.phone?.message)}>
        <Input autoComplete="tel" inputMode="tel" placeholder="012 345 678" className="h-11 rounded-xl" {...register("phone")} />
      </Field>
      <Field label={a.customers.email} error={msg(errors.email?.message)}>
        <Input type="email" autoComplete="email" className="h-11 rounded-xl" {...register("email")} />
      </Field>
      <Field label={a.users.password} error={errors.password && "≥ 10"}>
        <Input type="password" autoComplete="new-password" className="h-11 rounded-xl" {...register("password")} />
      </Field>
      <Field label={a.account.confirmPassword} error={msg(errors.confirmPassword?.message)}>
        <Input type="password" autoComplete="new-password" className="h-11 rounded-xl" {...register("confirmPassword")} />
      </Field>
      <Button type="submit" disabled={pending} className="h-11 w-full rounded-full font-bold">
        {pending && <Loader2 className="size-4 animate-spin" />}
        {a.account.register}
      </Button>
    </form>
  );
}
