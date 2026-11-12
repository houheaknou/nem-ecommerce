"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { DataTable } from "@/components/admin/data-table";
import { Field } from "@/components/admin/field";
import { deletePromotion, savePromotion } from "@/features/pricing/actions";
import { promotionSchema, type PromotionInput } from "@/features/pricing/schemas";
import type { PricingVariant, PromotionRow } from "@/features/pricing/queries";
import { useServerAction } from "@/hooks/use-action";
import { useAdminText } from "@/i18n/admin-text-context";
import { formatMoney } from "@/lib/money";

const ALL = "__all__";

export function PromotionsPanel({ promotions, variants }: { promotions: PromotionRow[]; variants: PricingVariant[] }) {
  const { a, locale } = useAdminText();
  const router = useRouter();
  const { exec } = useServerAction();
  const [editing, setEditing] = useState<Partial<PromotionRow> | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const columns: ColumnDef<PromotionRow, unknown>[] = [
    { accessorKey: "name", header: a.pricing.promoName, cell: ({ row }) => <span className="font-bold">{row.original.name}</span> },
    { id: "target", header: a.catalog.variant, cell: ({ row }) => row.original.sku ?? a.pricing.allVariants },
    { id: "off", header: a.pricing.percentOff, cell: ({ row: { original: p } }) => [p.percentOff ? `${p.percentOff}%` : null, p.amountOff ? formatMoney(p.amountOff, "KHR", locale) : null].filter(Boolean).join(" + ") },
    { id: "who", header: a.pricing.appliesTo, cell: ({ row: { original: p } }) => (p.appliesTo === "RETAIL" ? a.pricing.retail : p.appliesTo === "WHOLESALE" ? a.pricing.wholesale : a.pricing.both) },
    { id: "dates", header: a.pricing.validFrom, cell: ({ row: { original: p } }) => {
      const live = p.isActive && p.validFrom <= today && p.validTo >= today;
      return <span>{p.validFrom} → {p.validTo} {live && <Badge className="ml-1 rounded-full bg-success/15 text-success">●</Badge>}</span>;
    } },
    { id: "actions", header: "", cell: ({ row }) => (
      <div className="flex justify-end gap-1">
        <Button size="icon" variant="ghost" className="rounded-full" aria-label={a.common.edit} onClick={() => setEditing(row.original)}><Pencil className="size-4" /></Button>
        <ConfirmButton onConfirm={() => exec(() => deletePromotion(row.original.id), { onSuccess: () => router.refresh() })}>
          <Button size="icon" variant="ghost" className="rounded-full text-destructive" aria-label={a.common.delete}><Trash2 className="size-4" /></Button>
        </ConfirmButton>
      </div>
    ) },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={promotions}
        toolbar={<Button className="ml-auto rounded-full" onClick={() => setEditing({ isActive: true, validFrom: today, validTo: today })}><Plus className="size-4" />{a.pricing.newPromotion}</Button>}
      />
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>{a.pricing.promotions}</DialogTitle></DialogHeader>
          {editing && <PromotionForm initial={editing} variants={variants} onDone={() => { setEditing(null); router.refresh(); }} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function PromotionForm({ initial, variants, onDone }: { initial: Partial<PromotionRow>; variants: PricingVariant[]; onDone: () => void }) {
  const { a, locale } = useAdminText();
  const { pending, exec } = useServerAction();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<PromotionInput>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      id: initial.id,
      name: initial.name ?? "",
      variantId: initial.variantId ?? null,
      percentOff: initial.percentOff ?? null,
      amountOff: initial.amountOff ?? null,
      appliesTo: initial.appliesTo ?? null,
      validFrom: initial.validFrom ?? "",
      validTo: initial.validTo ?? "",
      isActive: initial.isActive ?? true,
    },
  });
  const numOrNull = { setValueAs: (v: string) => (v === "" || v === null ? null : Number(v)) };

  return (
    <form onSubmit={handleSubmit((v) => exec(() => savePromotion(v), { onSuccess: onDone }))} className="space-y-3">
      <Field label={a.pricing.promoName} error={errors.name && a.errors.required}><Input {...register("name")} /></Field>
      <Field label={a.catalog.variant}>
        <Select value={watch("variantId") ?? ALL} onValueChange={(v) => setValue("variantId", v === ALL ? null : v)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{a.pricing.allVariants}</SelectItem>
            {variants.map((v) => <SelectItem key={v.id} value={v.id}>{v.sku} — {locale === "km" ? v.labelKm : v.labelEn}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={a.pricing.percentOff} error={errors.percentOff?.message}><Input type="number" step="0.5" {...register("percentOff", numOrNull)} /></Field>
        <Field label={a.pricing.amountOff}><Input type="number" step="100" {...register("amountOff", numOrNull)} /></Field>
        <Field label={a.pricing.validFrom} error={errors.validFrom && a.errors.required}><Input type="date" {...register("validFrom")} /></Field>
        <Field label={a.pricing.validTo} error={errors.validTo?.message}><Input type="date" {...register("validTo")} /></Field>
      </div>
      <Field label={a.pricing.appliesTo}>
        <Select value={watch("appliesTo") ?? ALL} onValueChange={(v) => setValue("appliesTo", v === ALL ? null : (v as "RETAIL" | "WHOLESALE"))}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{a.pricing.both}</SelectItem>
            <SelectItem value="RETAIL">{a.pricing.retail}</SelectItem>
            <SelectItem value="WHOLESALE">{a.pricing.wholesale}</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <Switch checked={watch("isActive")} onCheckedChange={(v) => setValue("isActive", v)} /> {a.common.active}
      </label>
      <DialogFooter><Button type="submit" disabled={pending} className="rounded-full">{pending ? a.common.saving : a.common.save}</Button></DialogFooter>
    </form>
  );
}
