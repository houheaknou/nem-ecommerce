"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/i18n/admin-text";
import { useAdminText } from "@/i18n/admin-text-context";
import type { ActionResult } from "@/lib/action";

/**
 * Runs a server action with pending state and toasts.
 * Returns the result so callers can map fieldErrors onto their form.
 */
export function useServerAction() {
  const { a } = useAdminText();
  const [pending, start] = useTransition();

  function exec<T>(
    fn: () => Promise<ActionResult<T>>,
    opts: { success?: string | false; onSuccess?: (data: T) => void; onError?: (r: Extract<ActionResult<T>, { ok: false }>) => void } = {},
  ) {
    start(async () => {
      const r = await fn();
      if (r.ok) {
        if (opts.success !== false) toast.success(opts.success ?? a.common.saved);
        opts.onSuccess?.(r.data);
      } else {
        toast.error(errorMessage(r.error, a));
        opts.onError?.(r);
      }
    });
  }

  return { pending, exec };
}
