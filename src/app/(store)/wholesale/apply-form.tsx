"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/admin/field";
import { applyWholesale } from "@/features/account/actions";
import { wholesaleApplicationSchema, type WholesaleApplicationInput } from "@/features/customers/schemas";
import { useServerAction } from "@/hooks/use-action";
import { useAdminText } from "@/i18n/admin-text-context";

export function WholesaleApplyForm() {
  const { a } = useAdminText();
  const router = useRouter();
  const { pending, exec } = useServerAction();
  const { register, handleSubmit, formState: { errors } } = useForm<WholesaleApplicationInput>({
    resolver: zodResolver(wholesaleApplicationSchema),
    defaultValues: { businessName: "", businessType: "", expectedMonthlyPacks: null },
  });
  return (
    <form
      onSubmit={handleSubmit((v) => exec(() => applyWholesale(v), { success: a.account.applicationSent, onSuccess: () => router.refresh() }))}
      className="grid gap-3 sm:grid-cols-3"
    >
      <Field label={a.customers.businessName} error={errors.businessName && a.errors.required}><Input {...register("businessName")} /></Field>
      <Field label={`${a.wholesale.businessType} ${a.common.optional}`}><Input placeholder="Mini mart, restaurant…" {...register("businessType")} /></Field>
      <Field label={`${a.wholesale.expectedMonthlyPacks} ${a.common.optional}`}>
        <Input type="number" min={0} {...register("expectedMonthlyPacks", { setValueAs: (v) => (v === "" || v === null ? null : Number(v)) })} />
      </Field>
      <div className="sm:col-span-3">
        <Button type="submit" disabled={pending} className="rounded-full">{pending ? a.common.saving : a.account.submitApplication}</Button>
      </div>
    </form>
  );
}
