import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hasPermission, isStaff, type Permission } from "./permissions";

export class AuthError extends Error {
  constructor(public readonly code: "UNAUTHENTICATED" | "FORBIDDEN", message?: string) {
    super(message ?? code);
  }
}

/**
 * Loads the current user's roles from the DATABASE (not the JWT), so revoking
 * a role or deactivating a user takes effect on the next request.
 */
export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      locale: true,
      roles: { select: { role: { select: { code: true } } } },
      customer: { select: { id: true, type: true, wholesaleStatus: true } },
    },
  });
  if (!user || !user.isActive) return null;
  return { ...user, roleCodes: user.roles.map((r) => r.role.code) };
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED");
  return user;
}

export async function requireStaff() {
  const user = await requireUser();
  if (!isStaff(user.roleCodes)) throw new AuthError("FORBIDDEN");
  return user;
}

export async function requirePermission(perm: Permission) {
  const user = await requireUser();
  if (!hasPermission(user.roleCodes, perm)) {
    throw new AuthError("FORBIDDEN", `Missing permission ${perm}`);
  }
  return user;
}

/** For pages: redirect instead of throwing. Returns the user and a `can()` helper. */
export async function pageGuard(perm?: Permission) {
  const user = await currentUser();
  if (!user) redirect("/login?callbackUrl=/admin");
  if (!isStaff(user.roleCodes) || (perm && !hasPermission(user.roleCodes, perm))) redirect("/admin");
  return { user, can: (p: Permission) => hasPermission(user.roleCodes, p) };
}

export async function can(perm: Permission): Promise<boolean> {
  const user = await currentUser();
  return !!user && hasPermission(user.roleCodes, perm);
}
