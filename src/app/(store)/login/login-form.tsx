"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/features/auth/actions";
import type { Dictionary } from "@/i18n/dictionaries";

export function LoginForm({ from, labels }: { from: string; labels: Dictionary["auth"] }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="w-full space-y-4 rounded-3xl border border-border bg-card p-6 shadow-soft">
      <input type="hidden" name="from" value={from} />
      <div className="space-y-1.5">
        <Label htmlFor="identifier">{labels.identifier}</Label>
        <Input id="identifier" name="identifier" autoComplete="username" required className="h-11 rounded-xl" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">{labels.password}</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required className="h-11 rounded-xl" />
      </div>
      {state?.error && <p role="alert" className="rounded-xl bg-destructive/10 p-2 text-sm text-destructive">{labels.invalid}</p>}
      <Button type="submit" disabled={pending} className="h-11 w-full rounded-full font-bold">
        {pending && <Loader2 className="size-4 animate-spin" />}
        {labels.submit}
      </Button>
    </form>
  );
}
