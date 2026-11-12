"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { CustomerPicker } from "@/components/admin/customer-picker";
import { Field } from "@/components/admin/field";
import { deletePriceList, savePriceList, setListCustomer } from "@/features/pricing/actions";
import { priceListSchema, type PriceListInput } from "@/features/pricing/schemas";
import type { getPriceList } from "@/features/pricing/queries";
import { useServerAction } from "@/hooks/use-action";
import { useAdminText } from "@/i18n/admin-text-context";

type List = NonNullable<Awaited<ReturnType<typeof getPriceList>>>;

export function PriceListSettings({ list }: { list: List }) {
  const { a } = useAdminText();
  const router = useRouter();
  const { pending, exec } = useServerAction();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<PriceListInput>({
    resolver: zodResolver(priceListSchema),
    defaultValues: { id: list.id, name: list.name, validFrom: list.validFrom, validTo: list.validTo, isActive: list.isActive },
  });

  return (
    <div className="space-y-5">
      <Card className="rounded-3xl shadow-soft">
        <CardHeader><CardTitle>{a.pricing.listName}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => exec(() => savePriceList(v), { onSuccess: () => router.refresh() }))} className="space-y-3">
            <Field label={a.pricing.listName} error={errors.name && a.errors.required}><Input {...register("name")} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={a.pricing.validFrom}><Input type="date" {...register("validFrom")} /></Field>
              <Field label={a.pricing.validTo} error={errors.validTo?.message}><Input type="date" {...register("validTo")} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <Switch checked={watch("isActive")} onCheckedChange={(v) => setValue("isActive", v)} /> {a.common.active}
            </label>
            <div className="flex justify-between">
              <ConfirmButton onConfirm={() => exec(() => deletePriceList(list.id), { onSuccess: () => router.push("/admin/pricing") })}>
                <Button type="button" variant="ghost" className="rounded-full text-destructive"><Trash2 className="size-4" />{a.common.delete}</Button>
              </ConfirmButton>
              <Button type="submit" disabled={pending} className="rounded-full">{pending ? a.common.saving : a.common.save}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-3xl shadow-soft">
        <CardHeader><CardTitle>{a.pricing.customers}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <CustomerPicker
            exclude={list.customers.map((c) => c.id)}
            onPick={(c) => exec(() => setListCustomer(list.id, c.id, true), { onSuccess: () => router.refresh() })}
          />
          <ul className="divide-y divide-border text-sm">
            {list.customers.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2">
                <Link href={`/admin/customers/${c.id}`} className="hover:text-primary">
                  <span className="font-bold">{c.fullName}</span>
                  <span className="block text-xs text-muted-foreground">{c.code}{c.businessName ? ` · ${c.businessName}` : ""}</span>
                </Link>
                <Button size="icon" variant="ghost" className="rounded-full" aria-label={a.common.remove} onClick={() => exec(() => setListCustomer(list.id, c.id, false), { onSuccess: () => router.refresh() })}>
                  <X className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
