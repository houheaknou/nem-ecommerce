"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/i18n/admin-text";
import { useAdminText } from "@/i18n/admin-text-context";

/** Uploads to /api/uploads and manages an ordered list of image URLs. */
export function ImageUploader({ value, onChange, max = 6 }: { value: string[]; onChange: (urls: string[]) => void; max?: number }) {
  const { a } = useAdminText();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const added: string[] = [];
    for (const file of Array.from(files).slice(0, max - value.length)) {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/uploads?folder=products", { method: "POST", body });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (json.url) added.push(json.url);
      else toast.error(errorMessage(json.error ?? "UNEXPECTED", a));
    }
    onChange([...value, ...added]);
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="flex flex-wrap gap-3">
      {value.map((url, i) => (
        <div key={url} className="group relative size-24 overflow-hidden rounded-2xl border border-border bg-secondary">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="size-full object-cover" />
          {i === 0 && <span className="absolute bottom-1 left-1 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">1</span>}
          <button
            type="button"
            aria-label={a.common.remove}
            onClick={() => onChange(value.filter((u) => u !== url))}
            className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-background/90 opacity-0 shadow transition group-hover:opacity-100 focus:opacity-100"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      {value.length < max && (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="size-24 flex-col gap-1 rounded-2xl border-dashed text-xs"
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
          {busy ? a.common.uploading : a.common.upload}
        </Button>
      )}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => upload(e.target.files)} />
    </div>
  );
}
