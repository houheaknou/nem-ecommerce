import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddressBook } from "@/components/common/address-book";
import { getMyAccount } from "@/features/account/queries";
import { logoutAction } from "@/features/auth/actions";
import { currentUser } from "@/features/auth/guard";
import { isStaff } from "@/features/auth/permissions";
import { listLocations } from "@/features/customers/queries";
import { getI18n } from "@/i18n/server";
import { formatMoney } from "@/lib/money";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect("/login?callbackUrl=/account");
  if (!user.customer) redirect(isStaff(user.roleCodes) ? "/admin" : "/");
  const [{ a, t, locale }, me, locations] = await Promise.all([getI18n(), getMyAccount(user.customer.id), listLocations()]);
  if (!me) redirect("/");

  const wholesaleText =
    me.wholesaleStatus === "APPROVED" ? a.account.wholesaleApproved
    : me.wholesaleStatus === "PENDING" ? a.account.wholesalePending
    : me.wholesaleStatus === "REJECTED" ? a.account.wholesaleRejected
    : a.account.wholesaleIntro;

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-10">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-black">{a.account.myAccount}</h1>
          <p className="text-sm text-muted-foreground">{me.code} · {me.email}</p>
        </div>
        <form action={logoutAction}>
          <Button variant="ghost" className="rounded-full"><LogOut className="size-4" />{t.nav.logout}</Button>
        </form>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="rounded-3xl shadow-soft">
          <CardHeader><CardTitle>{a.account.profile}</CardTitle></CardHeader>
          <CardContent><ProfileForm fullName={me.fullName} phone={me.phone} /></CardContent>
        </Card>

        <Card className="rounded-3xl bg-success/10 shadow-soft">
          <CardHeader><CardTitle className="flex items-center gap-2"><Store className="size-5 text-success" />{a.account.wholesaleSection}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>{wholesaleText}</p>
            {me.lastApplication?.reviewNote && me.wholesaleStatus === "REJECTED" && (
              <p className="text-muted-foreground">“{me.lastApplication.reviewNote}”</p>
            )}
            {(me.wholesaleStatus === "NONE" || me.wholesaleStatus === "REJECTED") && (
              <Button asChild className="rounded-full"><Link href="/wholesale">{a.account.applyWholesale}</Link></Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl shadow-soft">
        <CardHeader><CardTitle>{a.account.addressBook}</CardTitle></CardHeader>
        <CardContent><AddressBook mode="self" addresses={me.addresses} locations={locations} /></CardContent>
      </Card>

      <Card className="rounded-3xl shadow-soft">
        <CardHeader><CardTitle>{a.customers.orderHistory}</CardTitle></CardHeader>
        <CardContent>
          {me.orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">{a.account.ordersSoon}</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {me.orders.map((o) => (
                <li key={o.id} className="flex justify-between py-2">
                  <span><b>{o.orderNo}</b><span className="block text-xs text-muted-foreground">{o.orderedAt} · {o.status}</span></span>
                  <span className="tabular-nums">{formatMoney(o.grandTotal, "KHR", locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
