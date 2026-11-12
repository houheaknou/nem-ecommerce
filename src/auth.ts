import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

declare module "next-auth" {
  interface Session {
    user: { id: string; roles: string[] } & DefaultSession["user"];
  }
}

const credentialsSchema = z.object({
  identifier: z.string().trim().min(3).max(120), // email or phone
  password: z.string().min(6).max(200),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { identifier: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { identifier, password } = parsed.data;
        if (!rateLimit(`login:${identifier.toLowerCase()}`, 8, 15 * 60_000)) return null;

        const user = await db.user.findFirst({
          where: { OR: [{ email: identifier.toLowerCase() }, { phone: identifier }], isActive: true },
          include: { roles: { include: { role: true } } },
        });
        // Compare even when the user is missing, to keep timing uniform.
        const ok = await bcrypt.compare(
          password,
          user?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv",
        );
        if (!user || !ok) return null;

        await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          roles: user.roles.map((r) => r.role.code),
        };
      },
    }),
  ],
});
