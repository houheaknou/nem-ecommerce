import Link from "next/link";
import { AlertTriangle, CalendarClock, Clock, Coins, PiggyBank, ShoppingCart, Store, Truck, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/features/auth/guard";
import { hasPermission } from "@/features/auth/permissions";
import { getDashboardStats } from "@/features/reports/dashboard";
import { getI18n } from "@/i18n/server";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export default async function AdminDashboard() {
  const user = await requireStaff();
  const canProfit = hasPermission(user.roleCodes, "report.profit");
  const canSales = canProfit || hasPermission(user.roleCodes, "report.sales") || hasPermission(user.roleCodes, "order.view");
  const [{ t, locale }, s] = await Promise.all([getI18n(), getDashboardStats(canProfit)]);
  const k = t.admin.kpi;
  const money = (v: string) => formatMoney(v, "KHR", locale);

  const tiles = [
    canSales && { label: k.todaySales, value: money(s.todaySales), icon: Coins, tone: "bg-accent text-accent-foreground" },
    canSales && { label: `${k.retailRevenue} · ${k.thisMonth}`, value: money(s.retailRevenue), icon: Wallet, tone: "bg-secondary text-primary" },
    canSales && { label: `${k.wholesaleRevenue} · ${k.thisMonth}`, value: money(s.wholesaleRevenue), icon: Store, tone: "bg-success/15 text-success" },
    { label: `${k.totalOrders} · ${k.thisMonth}`, value: s.totalOrders, icon: ShoppingCart, tone: "bg-warning/25 text-warning-foreground" },
    { label: k.pendingOrders, value: s.pendingOrders, icon: Clock, tone: "bg-accent text-accent-foreground" },
    { label: k.pendingDeliveries, value: s.pendingDeliveries, icon: Truck, tone: "bg-secondary text-primary" },
    s.financials && { label: `${k.totalExpenses} · ${k.thisMonth}`, value: money(s.financials.totalExpenses), icon: Wallet, tone: "bg-destructive/10 text-destructive" },
    s.financials && { label: `${k.grossProfit} · ${k.thisMonth}`, value: money(s.financials.grossProfit), icon: PiggyBank, tone: "bg-success/15 text-success" },
    s.financials && { label: `${k.netProfit} · ${k.thisMonth}`, value: money(s.financials.netProfit), icon: PiggyBank, tone: "bg-success/15 text-success" },
  ].filter(Boolean) as { label: string; value: string | number; icon: typeof Coins; tone: string }[];

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-black">{t.admin.menu.dashboard}</h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="rounded-3xl shadow-soft">
            <CardContent className="flex items-center gap-4">
              <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", tone)}>
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-muted-foreground">{label}</p>
                <p className="text-2xl font-black tabular-nums">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-3xl shadow-soft lg:col-span-1">
          <CardHeader><CardTitle>{k.recentOrders}</CardTitle></CardHeader>
          <CardContent>
            {s.recentOrders.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{k.noData}</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {s.recentOrders.map((o) => (
                  <li key={o.id} className="flex justify-between py-2">
                    <span><span className="font-bold">{o.orderNo}</span> · {o.customer.fullName}</span>
                    <span className="tabular-nums">{money(o.grandTotal)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-soft">
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="size-4 text-warning" />{k.lowStock}</CardTitle></CardHeader>
          <CardContent>
            {s.lowStock.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{k.noData}</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {s.lowStock.map((v) => (
                  <li key={v.id} className="flex justify-between py-2">
                    <span>{locale === "km" ? v.product.nameKm : v.product.nameEn} · {locale === "km" ? v.nameKm : v.nameEn}</span>
                    <span className="font-bold text-destructive tabular-nums">{v.available} / {v.minStock}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-soft">
          <CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="size-4 text-primary" />{k.expiring}</CardTitle></CardHeader>
          <CardContent>
            {s.expiring.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{k.noData}</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {s.expiring.map((b) => (
                  <li key={b.id} className="flex justify-between py-2">
                    <span><span className="font-bold">{b.batchNo}</span></span>
                    <span className="tabular-nums">{b.onHandQty} · {b.expiryDate.toISOString().slice(0, 10)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Revenue counts COMPLETED orders only. <Link href="/" className="underline">Storefront →</Link>
      </p>
    </div>
  );
}
