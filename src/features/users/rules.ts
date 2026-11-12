/**
 * Guard rails for staff user management (pure, unit-tested).
 * - Only a Super Admin may grant or revoke SUPER_ADMIN.
 * - Nobody can deactivate themselves or drop their own user.manage access
 *   (prevents locking the business out of its own system).
 */
import { hasPermission } from "@/features/auth/permissions";

export type UserChangeError = "FORBIDDEN" | "SELF_LOCKOUT";

export function checkUserChange(opts: {
  actorId: string;
  actorRoles: string[];
  targetId: string | null; // null = new user
  targetCurrentRoles: string[];
  nextRoles: string[];
  nextActive: boolean;
}): UserChangeError | null {
  const actorIsSuper = opts.actorRoles.includes("SUPER_ADMIN");
  const touchesSuper = opts.nextRoles.includes("SUPER_ADMIN") !== opts.targetCurrentRoles.includes("SUPER_ADMIN");
  if (touchesSuper && !actorIsSuper) return "FORBIDDEN";
  // An Admin may not edit a Super Admin at all.
  if (opts.targetCurrentRoles.includes("SUPER_ADMIN") && !actorIsSuper) return "FORBIDDEN";

  if (opts.targetId === opts.actorId) {
    if (!opts.nextActive) return "SELF_LOCKOUT";
    if (!hasPermission(opts.nextRoles, "user.manage")) return "SELF_LOCKOUT";
  }
  return null;
}
