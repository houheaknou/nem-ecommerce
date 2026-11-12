"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DataTable } from "@/components/admin/data-table";
import { NemIllustration } from "@/components/brand/nem-illustration";
import { setProductActive } from "@/features/catalog/actions";
import type { AdminProductRow } from "@/features/catalog/admin-queries";
import { useServerAction } from "@/hooks/use-action";
import { useAdminText } from "@/i18n/admin-text-context";
import { formatMoney } from "@/lib/money";

export function ProductTable({ products, canEdit }: { products: AdminProductRow[]; canEdit: boolean }) {
  const { a, locale } = useAdminText();
  const router = useRouter();
  const { exec } = useServerAction();
  const money = (n: number) => formatMoney(n, "KHR", locale);

  const columns: ColumnDef<AdminProductRow, unknown>[] = [
    {
      id: "name",
      accessorFn: (r) => `${r.nameKm} ${r.nameEn}`,
      header: a.catalog.product,
      cell: ({ row: { original: p } }) => (
        <div className="flex items-center gap-3">
          <div className="size-11 shrink-0 overflow-hidden rounded-xl bg-accent">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.imageUrl ? <img src={p.imageUrl} alt="" className="size-full object-cover" /> : <NemIllustration className="p-1" />}
          </div>
          <div>
            <p className="font-bold">
              {locale === "km" ? p.nameKm : p.nameEn}
              {p.isFeatured && <Star className="ml-1 inline size-3.5 fill-warning text-warning" />}
            </p>
            <p className="text-xs text-muted-foreground">{locale === "km" ? p.nameEn : p.nameKm}</p>
          </div>
        </div>
      ),
    },
    { id: "category", accessorFn: (r) => (locale === "km" ? r.categoryKm : r.categoryEn), header: a.catalog.category },
    { accessorKey: "variantCount", header: a.catalog.variants },
    {
      id: "price",
      accessorFn: (r) => r.minPrice,
      header: a.catalog.retailPrice,
      cell: ({ row: { original: p } }) => (p.minPrice === p.maxPrice ? money(p.minPrice) : `${money(p.minPrice)} – ${money(p.maxPrice)}`),
    },
    {
      accessorKey: "available",
      header: a.catalog.stock,
      cell: ({ row }) => <span className={row.original.available <= 0 ? "font-bold text-destructive" : ""}>{row.original.available}</span>,
    },
    {
      accessorKey: "isActive",
      header: a.common.status,
      cell: ({ row: { original: p } }) =>
        canEdit ? (
          <Switch
            checked={p.isActive}
            aria-label={a.common.active}
            onCheckedChange={(v) => exec(() => setProductActive(p.id, v), { onSuccess: () => router.refresh() })}
          />
        ) : (
          <Badge variant="secondary" className="rounded-full">{p.isActive ? a.common.active : a.common.inactive}</Badge>
        ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        canEdit && (
          <Button asChild size="icon" variant="ghost" className="rounded-full" aria-label={a.common.edit}>
            <Link href={`/admin/products/${row.original.id}`}><Pencil className="size-4" /></Link>
          </Button>
        ),
    },
  ];

  return <DataTable columns={columns} data={products} />;
}
