"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Store, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { reviewWholesale } from "@/features/customers/actions";
import type { listPendingWholesale } from "@/features/customers/queries";
import { useServerAction } from "@/hooks/use-action";
import { useAdminText } from "@/i18n/admin-text-context";

type Item = Awaited<ReturnType<typeof listPendingWholesale>>[number];

export function WholesaleQueue({ items }: { items: Item[] }) {
  const { a } = useAdminText();
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border p-10 text-center text-muted-foreground">
        <Store className="mx-auto mb-2 size-8 text-primary" />
        {a.wholesale.empty}
      </div>
    );
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {items.map((i) => <Application key={i.id} item={i} />)}
    </div>
  );
}

function Application({ item }: { item: Item }) {
  const { a } = useAdminText();
  const router = useRouter();
  const { pending, exec } = useServerAction();
  const [note, setNote] = useState("");
  const decide = (approve: boolean) =>
    exec(() => reviewWholesale(item.id, approve, note), {
      success: approve ? a.wholesale.approved : a.wholesale.rejected,
      onSuccess: () => router.refresh(),
    });

  return (
    <Card className="rounded-3xl shadow-soft">
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-heading text-lg font-black">{item.businessName}</p>
            <Link href={`/admin/customers/${item.customer.id}`} className="text-sm font-semibold text-primary hover:underline">
              {item.customer.fullName} · {item.customer.code}
            </Link>
          </div>
          <span className="text-xs text-muted-foreground">{a.wholesale.requestedAt}<br />{item.createdAt}</span>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div><dt className="text-xs text-muted-foreground">{a.customers.phone}</dt><dd>{item.customer.phone}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{a.customers.email}</dt><dd className="truncate">{item.customer.email ?? "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{a.wholesale.businessType}</dt><dd>{item.businessType || "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{a.wholesale.expectedMonthlyPacks}</dt><dd>{item.expectedMonthlyPacks ?? "—"}</dd></div>
        </dl>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={a.wholesale.reviewNote} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={pending} className="rounded-full text-destructive" onClick={() => decide(false)}><X className="size-4" />{a.wholesale.reject}</Button>
          <Button disabled={pending} className="rounded-full bg-success text-success-foreground hover:bg-success/90" onClick={() => decide(true)}><Check className="size-4" />{a.wholesale.approve}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
