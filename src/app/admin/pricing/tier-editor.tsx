"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveVariantTiers } from "@/features/pricing/actions";
import { PricingError, validateTiers } from "@/features/pricing/domain/pricing";
import type { PricingVariant } from "@/features/pricing/queries";
import { useServerAction } from "@/hooks/use-action";
import { useAdminText } from "@/i18n/admin-text-context";
import { formatMoney } from "@/lib/money";

type Tier = { minQty: number; maxQty: number | null; unitPrice: number };

/** Edits the quantity tiers of one variant in one price list. */
export function TierEditor({ variant, initial, priceListId }: { variant: PricingVariant; initial: Tier[]; priceListId?: string }) {
  const { a, locale } = useAdminText();
  const router = useRouter();
  const { pending, exec } = useServerAction();
  const [rows, setRows] = useState<Tier[]>(initial);
  const dirty = JSON.stringify(rows) !== JSON.stringify(initial);

  // Same rule the server enforces, shown live.
  let problem: string | null = null;
  try {
    validateTiers(rows);
  } catch (e) {
    problem = e instanceof PricingError ? e.message : String(e);
  }

  const update = (i: number, patch: Partial<Tier>) => setRows((r) => r.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const addRow = () => {
    const last = rows.at(-1);
    const start = last ? (last.maxQty ?? last.minQty) + 1 : 1;
    setRows((r) => [
      ...r.map((t, j) => (j === r.length - 1 && t.maxQty === null ? { ...t, maxQty: start - 1 } : t)),
      { minQty: start, maxQty: null, unitPrice: last ? last.unitPrice : variant.retailPrice },
    ]);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-bold">{locale === "km" ? variant.labelKm : variant.labelEn}</p>
          <p className="text-xs text-muted-foreground">
            {variant.sku} · {a.catalog.retailPrice}: {formatMoney(variant.retailPrice, "KHR", locale)}
            {!variant.isActive && ` · ${a.common.inactive}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={addRow}><Plus className="size-4" />{a.pricing.addTier}</Button>
          <Button
            type="button"
            size="sm"
            className="rounded-full"
            disabled={!dirty || !!problem || pending}
            onClick={() => exec(() => saveVariantTiers({ priceListId, variantId: variant.id, tiers: rows }), { onSuccess: () => router.refresh() })}
          >
            {pending ? a.common.saving : a.common.save}
          </Button>
        </div>
      </div>
      {rows.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_1fr_1.3fr_auto] gap-2 text-[11px] font-bold text-muted-foreground">
            <span>{a.pricing.minQty}</span><span>{a.pricing.maxQty}</span><span>{a.pricing.unitPrice}</span><span className="w-8" />
          </div>
          {rows.map((t, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1.3fr_auto] gap-2">
              <Input type="number" min={1} value={t.minQty} onChange={(e) => update(i, { minQty: e.target.valueAsNumber || 0 })} aria-label={a.pricing.minQty} />
              <Input type="number" min={1} value={t.maxQty ?? ""} placeholder="∞" onChange={(e) => update(i, { maxQty: e.target.value === "" ? null : e.target.valueAsNumber })} aria-label={a.pricing.maxQty} />
              <Input type="number" step={100} value={t.unitPrice} onChange={(e) => update(i, { unitPrice: e.target.valueAsNumber || 0 })} aria-label={a.pricing.unitPrice} />
              <Button type="button" size="icon" variant="ghost" className="rounded-full text-muted-foreground" aria-label={a.common.remove} onClick={() => setRows((r) => r.filter((_, j) => j !== i))}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {problem && rows.length > 0 && <p className="mt-2 text-xs text-destructive">{problem}</p>}
    </div>
  );
}
