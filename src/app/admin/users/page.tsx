import { PageHeader } from "@/components/admin/page-header";
import { pageGuard } from "@/features/auth/guard";
import { ROLES, STAFF_ROLES } from "@/features/auth/permissions";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n/server";
import { UserManager } from "./user-manager";

export default async function UsersPage() {
  const { user } = await pageGuard("user.manage");
  const { a, locale } = await getI18n();
  const users = await db.user.findMany({
    where: { roles: { some: { role: { code: { in: STAFF_ROLES } } } } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, phone: true, isActive: true, lastLoginAt: true, roles: { select: { role: { select: { code: true } } } } },
  });
  return (
    <>
      <PageHeader title={a.users.title} />
      <UserManager
        meId={user.id}
        iAmSuper={user.roleCodes.includes("SUPER_ADMIN")}
        roleOptions={STAFF_ROLES.map((code) => ({ code, label: ROLES[code][locale] }))}
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone ?? "",
          isActive: u.isActive,
          lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString().slice(0, 16).replace("T", " ") : "—",
          roles: u.roles.map((r) => r.role.code).filter((c) => (STAFF_ROLES as string[]).includes(c)),
        }))}
      />
    </>
  );
}
