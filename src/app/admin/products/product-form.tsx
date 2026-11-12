"use client";

import { useRouter } from "next/navigation";
import { useFieldArray, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { History, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/admin/field";
import { ImageUploader } from "@/components/admin/image-uploader";
import { saveProduct } from "@/features/catalog/actions";
import { productSchema, slugify, type ProductInput, type VariantInput } from "@/features/catalog/schemas";
import type { getProductForEdit } from "@/features/catalog/admin-queries";
import { useServerAction } from "@/hooks/use-action";
import { useAdminText } from "@/i18n/admin-text-context";
import { formatMoney } from "@/lib/money";

type Product = NonNullable<Awaited<ReturnType<typeof getProductForEdit>>>;

const blankVariant = (): VariantInput => ({
  sku: "",
  nameKm: "",
  nameEn: "",
  packageSize: "",
  unitsPerPackage: 1,
  weightGrams: 250,
  packagingGrams: 20,
  retailPrice: 0,
  costPrice: 0,
  trackStock: true,
  minStock: 10,
  isActive: true,
});

export function ProductForm({
  product,
  categories,
  canPrice,
  canCost,
}: {
  product: Product | null;
  categories: { id: string; name: string }[];
  canPrice: boolean;
  canCost: boolean;
}) {
  const { a, locale } = useAdminText();
  const router = useRouter();
  const { pending, exec } = useServerAction();

  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? { ...product }
      : {
          slug: "",
          nameKm: "",
          nameEn: "",
          descriptionKm: "",
          descriptionEn: "",
          categoryId: categories[0]?.id,
          shelfLifeDays: 7,
          isActive: true,
          isFeatured: false,
          images: [],
          variants: [blankVariant()],
        },
  });
  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = form;
  const variants = useFieldArray({ control, name: "variants", keyName: "_key" });
  const req = (e?: { message?: string }) => (e ? e.message || a.errors.required : undefined);

  const onSubmit = handleSubmit(
    (values) => {
      const payload = canCost ? values : { ...values, variants: values.variants.map(({ costPrice: _c, ...v }) => v) };
      exec(() => saveProduct(payload), {
        onSuccess: ({ id }) => {
          if (!product) router.replace(`/admin/products/${id}`);
          router.refresh();
        },
      });
    },
    (errs: FieldErrors<ProductInput>) => console.warn(errs),
  );

  return (
    <form onSubmit={onSubmit} className="grid gap-5 xl:grid-cols-3">
      <div className="space-y-5 xl:col-span-2">
        <Card className="rounded-3xl shadow-soft">
          <CardHeader><CardTitle>{a.catalog.product}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label={a.catalog.nameKm} error={req(errors.nameKm)}><Input {...register("nameKm")} /></Field>
            <Field label={a.catalog.nameEn} error={req(errors.nameEn)}>
              <Input {...register("nameEn", { onBlur: (e) => !form.getValues("slug") && setValue("slug", slugify(e.target.value)) })} />
            </Field>
            <Field label={a.catalog.slug} error={req(errors.slug)}><Input {...register("slug")} /></Field>
            <Field label={a.catalog.category} error={req(errors.categoryId)}>
              <Select value={watch("categoryId")} onValueChange={(v) => setValue("categoryId", v, { shouldValidate: true })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label={a.catalog.descriptionKm} className="sm:col-span-2"><Textarea rows={3} {...register("descriptionKm")} /></Field>
            <Field label={a.catalog.descriptionEn} className="sm:col-span-2"><Textarea rows={3} {...register("descriptionEn")} /></Field>
            <Field label={a.catalog.shelfLifeDays} error={req(errors.shelfLifeDays)}>
              <Input type="number" {...register("shelfLifeDays", { valueAsNumber: true })} />
            </Field>
            <div className="flex items-end gap-6 pb-2">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <Switch checked={watch("isActive")} onCheckedChange={(v) => setValue("isActive", v)} /> {a.common.active}
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <Switch checked={watch("isFeatured")} onCheckedChange={(v) => setValue("isFeatured", v)} /> {a.catalog.featured}
              </label>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{a.catalog.variants}</CardTitle>
            {canPrice && (
              <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => variants.append(blankVariant())}>
                <Plus className="size-4" />{a.catalog.addVariant}
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {!canPrice && <p className="rounded-xl bg-warning/20 p-2 text-xs">{a.catalog.noPriceEdit}</p>}
            {typeof errors.variants?.message === "string" && <p className="text-sm text-destructive">{errors.variants.message}</p>}
            {variants.fields.map((f, i) => {
              const e = errors.variants?.[i];
              const isNew = !f.id;
              return (
                <div key={f._key} className="relative rounded-2xl border border-border p-4">
                  {isNew && variants.fields.length > 1 && (
                    <Button type="button" size="icon" variant="ghost" className="absolute right-2 top-2 rounded-full" aria-label={a.common.remove} onClick={() => variants.remove(i)}>
                      <X className="size-4" />
                    </Button>
                  )}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label={a.catalog.sku} error={req(e?.sku)}><Input {...register(`variants.${i}.sku`)} className="uppercase" /></Field>
                    <Field label={a.catalog.nameKm} error={req(e?.nameKm)}><Input {...register(`variants.${i}.nameKm`)} /></Field>
                    <Field label={a.catalog.nameEn} error={req(e?.nameEn)}><Input {...register(`variants.${i}.nameEn`)} /></Field>
                    <Field label={a.catalog.packageSize}><Input {...register(`variants.${i}.packageSize`)} /></Field>
                    <Field label={a.catalog.unitsPerPackage} error={req(e?.unitsPerPackage)}><Input type="number" {...register(`variants.${i}.unitsPerPackage`, { valueAsNumber: true })} /></Field>
                    <Field label={a.catalog.minStock} error={req(e?.minStock)}><Input type="number" {...register(`variants.${i}.minStock`, { valueAsNumber: true })} /></Field>
                    <Field label={a.catalog.weightGrams} error={req(e?.weightGrams)}><Input type="number" {...register(`variants.${i}.weightGrams`, { valueAsNumber: true })} /></Field>
                    <Field label={a.catalog.packagingGrams} error={req(e?.packagingGrams)}><Input type="number" {...register(`variants.${i}.packagingGrams`, { valueAsNumber: true })} /></Field>
                    <Field label={a.catalog.retailPrice} error={req(e?.retailPrice)}>
                      <Input type="number" step="100" disabled={!canPrice} {...register(`variants.${i}.retailPrice`, { valueAsNumber: true })} />
                    </Field>
                    {canCost && (
                      <Field label={a.catalog.costPrice} error={req(e?.costPrice)}>
                        <Input type="number" step="100" {...register(`variants.${i}.costPrice`, { valueAsNumber: true })} />
                      </Field>
                    )}
                    <div className="flex items-end gap-5 pb-2 sm:col-span-2">
                      <label className="flex items-center gap-2 text-sm font-semibold">
                        <Switch checked={watch(`variants.${i}.trackStock`)} onCheckedChange={(v) => setValue(`variants.${i}.trackStock`, v)} /> {a.catalog.trackStock}
                      </label>
                      <label className="flex items-center gap-2 text-sm font-semibold">
                        <Switch checked={watch(`variants.${i}.isActive`)} onCheckedChange={(v) => setValue(`variants.${i}.isActive`, v)} /> {a.common.active}
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5">
        <Card className="rounded-3xl shadow-soft">
          <CardHeader><CardTitle>{a.catalog.images}</CardTitle></CardHeader>
          <CardContent>
            <ImageUploader value={watch("images")} onChange={(urls) => setValue("images", urls)} />
          </CardContent>
        </Card>

        {product && product.priceHistory.length > 0 && (
          <Card className="rounded-3xl shadow-soft">
            <CardHeader><CardTitle className="flex items-center gap-2"><History className="size-4" />{a.catalog.priceHistory}</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2 text-xs">
                {product.priceHistory.map((h) => (
                  <li key={h.id} className="flex justify-between gap-2 border-b border-border pb-1">
                    <span><span className="font-bold">{h.sku}</span> · {h.field === "costPrice" ? a.catalog.costPrice : a.catalog.retailPrice}</span>
                    <span className="text-right tabular-nums">
                      {formatMoney(h.oldValue, "KHR", locale)} → <b>{formatMoney(h.newValue, "KHR", locale)}</b>
                      <br /><span className="text-muted-foreground">{h.changedAt.slice(0, 10)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Button type="submit" size="lg" disabled={pending} className="sticky bottom-4 w-full rounded-full font-bold shadow-soft">
          {pending ? a.common.saving : a.common.save}
        </Button>
      </div>
    </form>
  );
}
