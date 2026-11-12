import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";
import { pageGuard } from "@/features/auth/guard";
import { listCustomers } from "@/features/customers/queries";
import { getI18n } from "@/i18n/server";
import { cn } from "@/lib/utils";

/** Server-side search & pagination via the URL (?q=&type=&page=). */
export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  const { can } = await pageGuard("customer.view");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = str("q");
  const type = str("type");
  const page = Number(str("page")) || 1;
  const [{ a }, result] = await Promise.all([getI18n(), listCustomers({ q, type, page })]);
  const qs = (patch: Record<string, string | number>) => {
    const p = new URLSearchParams({ ...(q && { q }), ...(type && { type }), page: String(page) });
    for (const [k, v] of Object.entries(patch)) {
      if (v === "") p.delete(k);
      else p.set(k, String(v));
    }
    return `/admin/customers?${p.toString()}`;
  };
  const filters = [
    { value: "", label: a.common.search.replace("…", "") },
    { value: "RETAIL", label: a.customers.retail },
    { value: "WHOLESALE", label: a.customers.wholesale },
  ];

  return (
    <>
      <PageHeader title={a.customers.title} description={`${result.total}`}>
        {can("customer.edit") && (
          <Button asChild className="rounded-full"><Link href="/admin/customers/new"><Plus className="size-4" />{a.customers.newCustomer}</Link></Button>
        )}
      </PageHeader>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <form className="relative w-full max-w-xs" action="/admin/customers">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder={a.common.search} className="h-9 rounded-full pl-9" />
          {type && <input type="hidden" name="type" value={type} />}
        </form>
        {filters.map((f) => (
          <Link
            key={f.value}
            href={qs({ type: f.value, page: 1 })}
            className={cn("rounded-full border px-3 py-1 text-sm font-semibold", type === f.value ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/60")}
          >
            {f.value ? f.label : "∗"}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-soft">
        <Table>
          <TableHeader className="bg-secondary/60">
            <TableRow>
              <TableHead>{a.customers.code}</TableHead>
              <TableHead>{a.customers.fullName}</TableHead>
              <TableHead>{a.customers.phone}</TableHead>
              <TableHead>{a.customers.type}</TableHead>
              <TableHead>{a.customers.source}</TableHead>
              <TableHead className="text-right">{a.customers.totalOrders}</TableHead>
              <TableHead>{a.common.createdAt}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">{a.common.noResults}</TableCell></TableRow>
            ) : (
              result.rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell><Link href={`/admin/customers/${c.id}`} className="font-mono text-xs font-bold text-primary hover:underline">{c.code}</Link></TableCell>
                  <TableCell>
                    <Link href={`/admin/customers/${c.id}`} className="font-bold hover:text-primary">{c.fullName}</Link>
                    {c.businessName && <span className="block text-xs text-muted-foreground">{c.businessName}</span>}
                  </TableCell>
                  <TableCell className="tabular-nums">{c.phone}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("rounded-full", c.type === "WHOLESALE" && "bg-success/15 text-success")}>
                      {c.type === "WHOLESALE" ? a.customers.wholesale : a.customers.retail}
                    </Badge>
                    {c.wholesaleStatus === "PENDING" && <Badge className="ml-1 rounded-full bg-warning text-warning-foreground">{a.customers.statuses.PENDING}</Badge>}
                  </TableCell>
                  <TableCell className="text-xs">{a.customers.sources[c.acquisitionSource]}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.orderCount}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.createdAt}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {result.pageCount > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">{a.common.page} {result.page} {a.common.of} {result.pageCount}</span>
          <Button asChild size="sm" variant="outline" className={cn("rounded-full", result.page <= 1 && "pointer-events-none opacity-50")}>
            <Link href={qs({ page: result.page - 1 })}>{a.common.prev}</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className={cn("rounded-full", result.page >= result.pageCount && "pointer-events-none opacity-50")}>
            <Link href={qs({ page: result.page + 1 })}>{a.common.next}</Link>
          </Button>
        </div>
      )}
    </>
  );
}
