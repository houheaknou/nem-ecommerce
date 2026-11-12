"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/admin/data-table";
import { savePriceList } from "@/features/pricing/actions";
import type { listCustomerPriceLists } from "@/features/pricing/queries";
import { useServerAction } from "@/hooks/use-action";
import { useAdminText } from "@/i18n/admin-text-context";

type Row = Awaited<ReturnType<typeof listCustomerPriceLists>>[number];

export function PriceListsPanel({ lists }: { lists: Row[] }) {
  const { a } = useAdminText();
  const router = useRouter();
  const { pending, exec } = useServerAction();

  const columns: ColumnDef<Row, unknown>[] = [
    { accessorKey: "name", header: a.pricing.listName, cell: ({ row }) => <span className="font-bold">{row.original.name}</span> },
    { id: "valid", header: a.pricing.validFrom, cell: ({ row: { original: l } }) => `${l.validFrom || "…"} → ${l.validTo || "…"}` },
    { accessorKey: "customerCount", header: a.pricing.customers },
    { accessorKey: "itemCount", header: a.pricing.wholesaleTiers },
    { accessorKey: "isActive", header: a.common.status, cell: ({ row }) => <Badge variant={row.original.isActive ? "default" : "secondary"} className="rounded-full">{row.original.isActive ? a.common.active : a.common.inactive}</Badge> },
    { id: "edit", header: "", cell: ({ row }) => (
      <Button asChild size="icon" variant="ghost" className="rounded-full" aria-label={a.common.edit}>
        <Link href={`/admin/pricing/lists/${row.original.id}`}><Pencil className="size-4" /></Link>
      </Button>
    ) },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{a.pricing.customerListsHint}</p>
      <DataTable
        columns={columns}
        data={lists}
        toolbar={
          <Button
            className="ml-auto rounded-full"
            disabled={pending}
            onClick={() =>
              exec(() => savePriceList({ name: `${a.pricing.newList} ${lists.length + 1}`, isActive: true, validFrom: "", validTo: "" }), {
                success: false,
                onSuccess: ({ id }) => router.push(`/admin/pricing/lists/${id}`),
              })
            }
          >
            <Plus className="size-4" />{a.pricing.newList}
          </Button>
        }
      />
    </div>
  );
}
