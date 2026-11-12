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
import { Switch } from "@/components/ui/switch";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { DataTable } from "@/components/admin/data-table";
import { Field } from "@/components/admin/field";
import { deleteCategory, saveCategory } from "@/features/catalog/actions";
import { categorySchema, slugify, type CategoryInput } from "@/features/catalog/schemas";
import { useServerAction } from "@/hooks/use-action";
import { useAdminText } from "@/i18n/admin-text-context";

type Row = CategoryInput & { id: string; productCount: number };

export function CategoryManager({ categories }: { categories: Row[] }) {
  const { a, locale } = useAdminText();
  const router = useRouter();
  const { exec } = useServerAction();
  const [editing, setEditing] = useState<Partial<Row> | null>(null);

  const columns: ColumnDef<Row, unknown>[] = [
    { accessorKey: locale === "km" ? "nameKm" : "nameEn", header: a.catalog.category, cell: ({ row }) => (
      <span><span className="font-bold">{locale === "km" ? row.original.nameKm : row.original.nameEn}</span>
      <span className="ml-2 text-xs text-muted-foreground">{locale === "km" ? row.original.nameEn : row.original.nameKm}</span></span>
    ) },
    { accessorKey: "slug", header: a.catalog.slug },
    { accessorKey: "productCount", header: a.catalog.products },
    { accessorKey: "sortOrder", header: a.catalog.sortOrder },
    { accessorKey: "isActive", header: a.common.status, cell: ({ row }) =>
      row.original.isActive ? <Badge className="rounded-full bg-success/15 text-success">{a.common.active}</Badge> : <Badge variant="secondary" className="rounded-full">{a.common.inactive}</Badge> },
    { id: "actions", header: "", cell: ({ row }) => (
      <div className="flex justify-end gap-1">
        <Button size="icon" variant="ghost" className="rounded-full" aria-label={a.common.edit} onClick={() => setEditing(row.original)}><Pencil className="size-4" /></Button>
        <ConfirmButton onConfirm={() => exec(() => deleteCategory(row.original.id), { onSuccess: () => router.refresh() })}>
          <Button size="icon" variant="ghost" className="rounded-full text-destructive" aria-label={a.common.delete} disabled={row.original.productCount > 0}><Trash2 className="size-4" /></Button>
        </ConfirmButton>
      </div>
    ) },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={categories}
        toolbar={<Button className="ml-auto rounded-full" onClick={() => setEditing({ isActive: true, sortOrder: categories.length + 1 })}><Plus className="size-4" />{a.common.new}</Button>}
      />
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>{editing?.id ? a.common.edit : a.common.new} · {a.catalog.category}</DialogTitle></DialogHeader>
          {editing && <CategoryForm initial={editing} onDone={() => { setEditing(null); router.refresh(); }} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CategoryForm({ initial, onDone }: { initial: Partial<Row>; onDone: () => void }) {
  const { a } = useAdminText();
  const { pending, exec } = useServerAction();
  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { id: initial.id, slug: initial.slug ?? "", nameKm: initial.nameKm ?? "", nameEn: initial.nameEn ?? "", sortOrder: initial.sortOrder ?? 0, isActive: initial.isActive ?? true },
  });
  const { register, handleSubmit, formState: { errors }, setValue, watch } = form;

  return (
    <form
      onSubmit={handleSubmit((v) => exec(() => saveCategory(v), { onSuccess: onDone }))}
      className="space-y-3"
    >
      <Field label={a.catalog.nameKm} error={errors.nameKm && a.errors.required}><Input {...register("nameKm")} /></Field>
      <Field label={a.catalog.nameEn} error={errors.nameEn && a.errors.required}>
        <Input {...register("nameEn", { onBlur: (e) => !form.getValues("slug") && setValue("slug", slugify(e.target.value)) })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={a.catalog.slug} error={errors.slug?.message}><Input {...register("slug")} /></Field>
        <Field label={a.catalog.sortOrder}><Input type="number" {...register("sortOrder", { valueAsNumber: true })} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <Switch checked={watch("isActive")} onCheckedChange={(v) => setValue("isActive", v)} /> {a.common.active}
      </label>
      <DialogFooter>
        <Button type="submit" disabled={pending} className="rounded-full">{pending ? a.common.saving : a.common.save}</Button>
      </DialogFooter>
    </form>
  );
}
