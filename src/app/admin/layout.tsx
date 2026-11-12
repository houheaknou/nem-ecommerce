import { redirect } from "next/navigation";
import { AdminMobileNav, AdminSidebar } from "@/components/admin/admin-sidebar";
import { ADMIN_NAV } from "@/components/admin/admin-nav";
import { LocaleSwitcher, ThemeToggle } from "@/components/common/preferences";
import { currentUser } from "@/features/auth/guard";
import { hasPermission, isStaff } from "@/features/auth/permissions";
import { getI18n } from "@/i18n/server";
import { AdminTextProvider } from "@/i18n/admin-text-context";
import { brandNames, getBranding } from "@/features/settings/branding";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await currentUser();
  if (!user) redirect("/login?callbackUrl=/admin");
  if (!isStaff(user.roleCodes)) redirect("/");
  const [{ t, locale }, b] = await Promise.all([getI18n(), getBranding()]);

  // Menu visibility is computed server-side from DB roles.
  const allowed = ADMIN_NAV.filter((n) => !n.perm || hasPermission(user.roleCodes, n.perm)).map((n) => n.key);
  const navProps = { allowed, labels: t.admin.menu, brand: { ...brandNames(b, locale), logoUrl: b.logoUrl }, logoutLabel: t.nav.logout };

  return (
    <div className="flex min-h-dvh bg-background">
      <AdminSidebar {...navProps} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur">
          <AdminMobileNav {...navProps} />
          <span className="text-sm font-bold text-muted-foreground">{user.name}</span>
          <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground">{user.roleCodes.join(", ")}</span>
          <div className="ml-auto flex items-center gap-1">
            <LocaleSwitcher locale={locale} />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <AdminTextProvider locale={locale}>{children}</AdminTextProvider>
        </main>
      </div>
    </div>
  );
}
