import type { Metadata } from "next";
import Link from "next/link";
import { NemIllustration } from "@/components/brand/nem-illustration";
import { getI18n } from "@/i18n/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { t, a } = await getI18n();
  const sp = await searchParams;
  const from = typeof sp.callbackUrl === "string" ? new URL(sp.callbackUrl, "http://x").pathname : "/";
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-12">
      <NemIllustration className="mb-4 h-28 w-36" />
      <h1 className="mb-6 font-heading text-2xl font-black">{t.auth.loginTitle}</h1>
      <LoginForm from={from} labels={t.auth} />
      <p className="mt-4 text-sm text-muted-foreground">
        {a.account.noAccount} <Link href="/register" className="font-bold text-primary hover:underline">{a.account.register}</Link>
      </p>
    </div>
  );
}
