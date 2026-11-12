"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/admin/field";
import { updateProfile } from "@/features/account/actions";
import { profileSchema, type ProfileInput } from "@/features/account/schemas";
import { useServerAction } from "@/hooks/use-action";
import { useAdminText } from "@/i18n/admin-text-context";

export function ProfileForm({ fullName, phone }: ProfileInput) {
  const { a } = useAdminText();
  const router = useRouter();
  const { pending, exec } = useServerAction();
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName, phone },
  });
  return (
    <form onSubmit={handleSubmit((v) => exec(() => updateProfile(v), { onSuccess: () => router.refresh() }))} className="space-y-3">
      <Field label={a.customers.fullName} error={errors.fullName && a.errors.required}><Input autoComplete="name" {...register("fullName")} /></Field>
      <Field label={a.customers.phone} error={errors.phone && a.errors.invalidPhone}><Input autoComplete="tel" inputMode="tel" {...register("phone")} /></Field>
      <Button type="submit" disabled={pending || !isDirty} className="rounded-full">{pending ? a.common.saving : a.common.save}</Button>
    </form>
  );
}
