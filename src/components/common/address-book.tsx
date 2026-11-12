"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Field } from "@/components/admin/field";
import { deleteMyAddress, saveMyAddress } from "@/features/account/actions";
import { deleteCustomerAddress, saveCustomerAddress } from "@/features/customers/actions";
import { addressSchema, type AddressInput } from "@/features/customers/schemas";
import type { LocationTree } from "@/features/customers/queries";
import { useServerAction } from "@/hooks/use-action";
import { useAdminText } from "@/i18n/admin-text-context";

type Address = AddressInput & { id: string };
const NONE = "__none__";

/**
 * Address list + editor. `mode="admin"` uses staff actions (customer.edit);
 * `mode="self"` uses the logged-in customer's own actions.
 */
export function AddressBook({
  mode,
  customerId,
  addresses,
  locations,
  canEdit = true,
}: {
  mode: "admin" | "self";
  customerId?: string;
  addresses: Address[];
  locations: LocationTree;
  canEdit?: boolean;
}) {
  const { a, locale } = useAdminText();
  const router = useRouter();
  const { exec } = useServerAction();
  const [editing, setEditing] = useState<Partial<Address> | null>(null);
  const placeName = (provinceId: number, districtId: number | null) => {
    const p = locations.find((x) => x.id === provinceId);
    const d = p?.districts.find((x) => x.id === districtId);
    const n = (x?: { nameKm: string; nameEn: string }) => (x ? (locale === "km" ? x.nameKm : x.nameEn) : "");
    return [n(d), n(p)].filter(Boolean).join(", ");
  };
  const remove = (id: string) => (mode === "admin" ? deleteCustomerAddress(customerId!, id) : deleteMyAddress(id));

  return (
    <div className="space-y-3">
      {addresses.length === 0 && <p className="text-sm text-muted-foreground">{a.customers.noAddresses}</p>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {addresses.map((ad) => (
          <li key={ad.id} className="rounded-2xl border border-border p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold">
                  <MapPin className="mr-1 inline size-3.5 text-primary" />
                  {ad.label || ad.recipientName}
                  {ad.isDefault && <Badge className="ml-2 rounded-full bg-success/15 text-success">{a.customers.default}</Badge>}
                </p>
                <p className="text-muted-foreground">{ad.recipientName} · {ad.phone}</p>
                <p>{[ad.street, placeName(ad.provinceId, ad.districtId)].filter(Boolean).join(", ")}</p>
                {ad.deliveryNotes && <p className="text-xs text-muted-foreground">“{ad.deliveryNotes}”</p>}
              </div>
              {canEdit && (
                <div className="flex shrink-0">
                  <Button size="icon" variant="ghost" className="size-8 rounded-full" aria-label={a.common.edit} onClick={() => setEditing(ad)}><Pencil className="size-3.5" /></Button>
                  <ConfirmButton onConfirm={() => exec(() => remove(ad.id), { onSuccess: () => router.refresh() })}>
                    <Button size="icon" variant="ghost" className="size-8 rounded-full text-destructive" aria-label={a.common.delete}><Trash2 className="size-3.5" /></Button>
                  </ConfirmButton>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      {canEdit && (
        <Button variant="outline" className="rounded-full" onClick={() => setEditing({ isDefault: addresses.length === 0 })}>
          <Plus className="size-4" />{a.customers.addAddress}
        </Button>
      )}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>{a.customers.addresses}</DialogTitle></DialogHeader>
          {editing && (
            <AddressForm
              initial={editing}
              locations={locations}
              save={(v) => (mode === "admin" ? saveCustomerAddress(customerId!, v) : saveMyAddress(v))}
              onDone={() => { setEditing(null); router.refresh(); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddressForm({
  initial,
  locations,
  save,
  onDone,
}: {
  initial: Partial<Address>;
  locations: LocationTree;
  save: (v: AddressInput) => ReturnType<typeof saveMyAddress>;
  onDone: () => void;
}) {
  const { a, locale } = useAdminText();
  const { pending, exec } = useServerAction();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      id: initial.id,
      label: initial.label ?? "",
      recipientName: initial.recipientName ?? "",
      phone: initial.phone ?? "",
      provinceId: initial.provinceId ?? locations[0]?.id,
      districtId: initial.districtId ?? null,
      street: initial.street ?? "",
      deliveryNotes: initial.deliveryNotes ?? "",
      isDefault: initial.isDefault ?? false,
    },
  });
  const province = locations.find((p) => p.id === watch("provinceId"));
  const name = (x: { nameKm: string; nameEn: string }) => (locale === "km" ? x.nameKm : x.nameEn);

  return (
    <form onSubmit={handleSubmit((v) => exec(() => save(v), { onSuccess: onDone }))} className="grid gap-3 sm:grid-cols-2">
      <Field label={a.customers.recipientName} error={errors.recipientName && a.errors.required}><Input {...register("recipientName")} /></Field>
      <Field label={a.customers.phone} error={errors.phone && a.errors.invalidPhone}><Input inputMode="tel" {...register("phone")} /></Field>
      <Field label={a.customers.province}>
        <Select value={String(watch("provinceId"))} onValueChange={(v) => { setValue("provinceId", Number(v)); setValue("districtId", null); }}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{locations.map((p) => <SelectItem key={p.id} value={String(p.id)}>{name(p)}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label={`${a.customers.district} ${a.common.optional}`}>
        <Select value={watch("districtId") ? String(watch("districtId")) : NONE} onValueChange={(v) => setValue("districtId", v === NONE ? null : Number(v))}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {province?.districts.map((d) => <SelectItem key={d.id} value={String(d.id)}>{name(d)}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label={a.customers.street} className="sm:col-span-2"><Input {...register("street")} /></Field>
      <Field label={`${a.customers.label} ${a.common.optional}`}><Input {...register("label")} /></Field>
      <Field label={`${a.customers.deliveryNotes} ${a.common.optional}`}><Input {...register("deliveryNotes")} /></Field>
      <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
        <Switch checked={watch("isDefault")} onCheckedChange={(v) => setValue("isDefault", v)} /> <Star className="size-3.5" />{a.customers.makeDefault}
      </label>
      <DialogFooter className="sm:col-span-2">
        <Button type="submit" disabled={pending} className="rounded-full">{pending ? a.common.saving : a.common.save}</Button>
      </DialogFooter>
    </form>
  );
}
