"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/admin/field";
import { findDuplicatePhone, saveCustomer } from "@/features/customers/actions";
import { customerSchema, ORDER_SOURCES, type CustomerInput } from "@/features/customers/schemas";
import type { CustomerDetail } from "@/features/customers/queries";
import { useServerAction } from "@/hooks/use-action";
import { useAdminText } from "@/i18n/admin-text-context";

export function CustomerForm({ customer, canEdit, canApprove }: { customer: CustomerDetail | null; canEdit: boolean; canApprove: boolean }) {
  const { a } = useAdminText();
  const router = useRouter();
  const { pending, exec } = useServerAction();
  const [dup, setDup] = useState<{ id: string; code: string; fullName: string } | null>(null);

  const { register, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer
      ? { id: customer.id, fullName: customer.fullName, phone: customer.phone, email: customer.email, type: customer.type, businessName: customer.businessName, contactPerson: customer.contactPerson, creditLimit: customer.creditLimit, acquisitionSource: customer.acquisitionSource, notes: customer.notes }
      : { fullName: "", phone: "", email: "", type: "RETAIL", businessName: "", contactPerson: "", creditLimit: 0, acquisitionSource: "ADMIN", notes: "" },
  });

  async function checkPhone() {
    const phone = getValues("phone");
    if (!phone) return setDup(null);
    const r = await findDuplicatePhone(phone, customer?.id);
    setDup(r.ok ? r.data : null);
  }

  const submit = (allowDuplicatePhone: boolean) =>
    handleSubmit((v) =>
      exec(() => saveCustomer({ ...v, allowDuplicatePhone }), {
        onSuccess: ({ id }) => {
          if (!customer) router.replace(`/admin/customers/${id}`);
          router.refresh();
        },
        onError: (r) => r.error.startsWith("DUPLICATE_PHONE") && checkPhone(),
      }),
    )();

  const err = (k: keyof CustomerInput) => {
    const m = errors[k]?.message;
    return m ? (m === "invalidPhone" ? a.errors.invalidPhone : m.includes("email") ? a.errors.invalidEmail : a.errors.required) : undefined;
  };
  const isWholesale = watch("type") === "WHOLESALE";
  const lockType = !canApprove && customer?.type !== "WHOLESALE";

  return (
    <Card className="rounded-3xl shadow-soft">
      <CardHeader><CardTitle>{a.customers.title}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={(e) => { e.preventDefault(); submit(false); }}>
          <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-2">
            <Field label={a.customers.fullName} error={err("fullName")}><Input {...register("fullName")} /></Field>
            <Field label={a.customers.phone} error={err("phone")}>
              <Input inputMode="tel" {...register("phone", { onBlur: checkPhone })} />
            </Field>
            {dup && (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-warning/20 p-3 text-sm sm:col-span-2">
                <AlertTriangle className="size-4 text-warning-foreground" />
                <span>{a.customers.duplicateWarning} <b>{dup.code} · {dup.fullName}</b></span>
                <Link href={`/admin/customers/${dup.id}`} className="font-bold text-primary underline">{a.customers.openExisting}</Link>
                <Button type="button" size="sm" variant="outline" className="ml-auto rounded-full" onClick={() => submit(true)}>{a.common.save} ✓</Button>
              </div>
            )}
            <Field label={`${a.customers.email} ${a.common.optional}`} error={err("email")}><Input type="email" {...register("email")} /></Field>
            <Field label={a.customers.source}>
              <Select value={watch("acquisitionSource")} onValueChange={(v) => setValue("acquisitionSource", v as CustomerInput["acquisitionSource"])}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{ORDER_SOURCES.map((s) => <SelectItem key={s} value={s}>{a.customers.sources[s]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label={a.customers.type} hint={customer && customer.wholesaleStatus !== "NONE" ? `${a.customers.wholesaleStatus}: ${a.customers.statuses[customer.wholesaleStatus]}` : undefined}>
              <Select value={watch("type")} disabled={lockType} onValueChange={(v) => setValue("type", v as CustomerInput["type"])}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RETAIL">{a.customers.retail}</SelectItem>
                  <SelectItem value="WHOLESALE">{a.customers.wholesale}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={a.customers.creditLimit}><Input type="number" step="1000" {...register("creditLimit", { valueAsNumber: true })} /></Field>
            {isWholesale && (
              <>
                <Field label={a.customers.businessName}><Input {...register("businessName")} /></Field>
                <Field label={a.customers.contactPerson}><Input {...register("contactPerson")} /></Field>
              </>
            )}
            <Field label={a.common.notes} className="sm:col-span-2"><Textarea rows={3} {...register("notes")} /></Field>
            {canEdit && (
              <div className="flex justify-end sm:col-span-2">
                <Button type="submit" disabled={pending} className="rounded-full px-6">{pending ? a.common.saving : a.common.save}</Button>
              </div>
            )}
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}
