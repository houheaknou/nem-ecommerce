import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { pageGuard } from "@/features/auth/guard";
import { getCustomer, listLocations } from "@/features/customers/queries";
import { getI18n } from "@/i18n/server";
import { formatMoney } from "@/lib/money";
import { CustomerForm } from "../customer-form";
import { AddressBook } from "@/components/common/address-book";

/** /admin/customers/new and /admin/customers/<uuid> */
export default async function CustomerPage({ params }: PageProps<"/admin/customers/[id]">) {
  const { id } = await params;
  const isNew = id === "new";
  const { can } = await pageGuard(isNew ? "customer.edit" : "customer.view");
  const [{ a, locale }, customer, locations] = await Promise.all([
    getI18n(),
    isNew || !/^[0-9a-f-]{36}$/.test(id) ? Promise.resolve(null) : getCustomer(id),
    listLocations(),
  ]);
  if (!isNew && !customer) notFound();
  const money = (n: number) => formatMoney(n, "KHR", locale);
  const canEdit = can("customer.edit");

  return (
    <>
      <PageHeader
        backHref="/admin/customers"
        title={customer ? customer.fullName : a.customers.newCustomer}
        description={customer ? `${customer.code} · ${a.common.createdAt} ${customer.createdAt}` : undefined}
      />
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <CustomerForm customer={customer} canEdit={canEdit} canApprove={can("wholesale.approve")} />
          {customer && (
            <Card className="rounded-3xl shadow-soft">
              <CardHeader><CardTitle>{a.customers.addresses}</CardTitle></CardHeader>
              <CardContent>
                <AddressBook mode="admin" customerId={customer.id} addresses={customer.addresses} locations={locations} canEdit={canEdit} />
              </CardContent>
            </Card>
          )}
        </div>

        {customer && (
          <div className="space-y-5">
            <Card className="rounded-3xl shadow-soft">
              <CardContent className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-xs text-muted-foreground">{a.customers.totalOrders}</p><p className="text-xl font-black">{customer.stats.orderCount}</p></div>
                <div><p className="text-xs text-muted-foreground">{a.customers.totalSpending}</p><p className="text-sm font-black">{money(customer.stats.totalSpending)}</p></div>
                <div><p className="text-xs text-muted-foreground">{a.customers.outstanding}</p><p className="text-sm font-black text-destructive">{money(customer.stats.outstanding)}</p></div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-soft">
              <CardHeader><CardTitle>{a.customers.orderHistory}</CardTitle></CardHeader>
              <CardContent>
                {customer.orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{a.common.noResults}</p>
                ) : (
                  <ul className="divide-y divide-border text-sm">
                    {customer.orders.map((o) => (
                      <li key={o.id} className="flex justify-between py-2">
                        <span><b>{o.orderNo}</b><span className="block text-xs text-muted-foreground">{o.orderedAt} · {o.status}</span></span>
                        <span className="tabular-nums">{money(o.grandTotal)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-soft">
              <CardHeader><CardTitle>{a.customers.priceLists}</CardTitle></CardHeader>
              <CardContent>
                {customer.priceLists.length === 0 ? (
                  <p className="text-sm text-muted-foreground">—</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {customer.priceLists.map((p) => (
                      <li key={p.id}>
                        {can("price.edit") ? <Link className="font-bold hover:text-primary" href={`/admin/pricing/lists/${p.id}`}>{p.name}</Link> : <b>{p.name}</b>}
                        {!p.isActive && <span className="text-xs text-muted-foreground"> · {a.common.inactive}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {customer.approvals.length > 0 && (
              <Card className="rounded-3xl shadow-soft">
                <CardHeader><CardTitle>{a.wholesale.queue}</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {customer.approvals.map((w) => (
                      <li key={w.id} className="flex justify-between gap-2">
                        <span>{w.businessName}<span className="block text-xs text-muted-foreground">{w.createdAt}{w.reviewNote ? ` · ${w.reviewNote}` : ""}</span></span>
                        <span className="text-xs font-bold">{a.customers.statuses[w.status]}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </>
  );
}
