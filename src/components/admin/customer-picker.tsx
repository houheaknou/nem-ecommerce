"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchCustomers } from "@/features/customers/actions";
import { useAdminText } from "@/i18n/admin-text-context";

type Hit = { id: string; code: string; fullName: string; businessName: string | null; type: "RETAIL" | "WHOLESALE" };

/** Debounced server search over name / business / code / phone. */
export function CustomerPicker({ onPick, exclude = [] }: { onPick: (c: Hit) => void; exclude?: string[] }) {
  const { a } = useAdminText();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      const r = await searchCustomers(q);
      if (!cancelled) {
        setHits(r.ok ? r.data : []);
        setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  const visible = q.trim().length < 2 ? [] : hits.filter((h) => !exclude.includes(h.id));

  return (
    <div className="relative">
      <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={a.common.search} className="rounded-full pl-9" />
      {loading && <Loader2 className="absolute right-3 top-2.5 size-4 animate-spin text-muted-foreground" />}
      {visible.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-2xl border border-border bg-popover p-1 shadow-soft">
          {visible.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => {
                  onPick(h);
                  setQ("");
                  setHits([]);
                }}
              >
                <span className="font-bold">{h.fullName}</span>
                {h.businessName && <span className="text-muted-foreground"> · {h.businessName}</span>}
                <span className="block text-xs text-muted-foreground">{h.code} · {h.type === "WHOLESALE" ? a.customers.wholesale : a.customers.retail}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
