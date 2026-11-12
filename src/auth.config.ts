import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe part of the Auth.js config (no DB access) — shared by proxy.ts
 * and the full config in auth.ts. The proxy only does coarse routing; every
 * server action / page re-checks permissions against the database.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.roles = (user as { roles?: string[] }).roles ?? [];
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.roles = (token.roles as string[]) ?? [];
      return session;
    },
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      const roles = auth?.user?.roles ?? [];
      if (path.startsWith("/admin")) {
        return roles.some((r) => !r.endsWith("_CUSTOMER"));
      }
      if (path.startsWith("/account")) return !!auth?.user;
      return true;
    },
  },
} satisfies NextAuthConfig;
