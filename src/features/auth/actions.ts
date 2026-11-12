"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export async function loginAction(_prev: { error?: boolean } | undefined, formData: FormData) {
  const from = String(formData.get("from") ?? "/");
  // Only allow same-site relative redirects.
  const redirectTo = from.startsWith("/") && !from.startsWith("//") ? from : "/";
  try {
    await signIn("credentials", {
      identifier: formData.get("identifier"),
      password: formData.get("password"),
      redirectTo,
    });
    return {};
  } catch (e) {
    if (e instanceof AuthError) return { error: true };
    throw e; // NEXT_REDIRECT must propagate
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
