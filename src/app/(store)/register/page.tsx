import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NemIllustration } from "@/components/brand/nem-illustration";
import { currentUser } from "@/features/auth/guard";
import { getI18n } from "@/i18n/server";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Register" };

export default async function RegisterPage() {
  if (await currentUser()) redirect("/account");
  const { a, t } = await getI18n();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-12">
      <NemIllustration className="mb-4 h-28 w-36" />
      <h1 className="mb-6 font-heading text-2xl font-black">{a.account.registerTitle}</h1>
      <RegisterForm />
      <p className="mt-4 text-sm text-muted-foreground">
        {a.account.haveAccount} <Link href="/login" className="font-bold text-primary hover:underline">{t.nav.login}</Link>
      </p>
    </div>
  );
}
