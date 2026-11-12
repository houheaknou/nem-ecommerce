import { notFound, redirect } from "next/navigation";
import { Construction } from "lucide-react";
import { ADMIN_NAV } from "@/components/admin/admin-nav";
import { requireStaff } from "@/features/auth/guard";
import { hasPermission } from "@/features/auth/permissions";
import { getI18n } from "@/i18n/server";

/** Placeholder for admin modules scheduled in later phases. Still permission-checked. */
export default async function AdminModulePage({ params }: PageProps<"/admin/[module]">) {
  const { module } = await params;
  const entry = ADMIN_NAV.find((n) => n.href === `/admin/${module}`);
  if (!entry) notFound();
  const user = await requireStaff();
  if (entry.perm && !hasPermission(user.roleCodes, entry.perm)) redirect("/admin");
  const { t } = await getI18n();
  return (
    <div className="mx-auto mt-10 max-w-md rounded-3xl border border-dashed border-border p-10 text-center">
      <Construction className="mx-auto mb-3 size-10 text-primary" />
      <h1 className="font-heading text-xl font-black">{t.admin.menu[entry.key]}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t.admin.comingSoon} (Phase {entry.phase})</p>
    </div>
  );
}
