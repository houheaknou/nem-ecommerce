"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useStoredFlag } from "@/hooks/use-hydrated";
import { ChevronsLeft, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/brand/nem-illustration";
import { ADMIN_NAV } from "./admin-nav";
import { logoutAction } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

interface Props {
  allowed: string[]; // nav keys the user may see (computed on the server)
  labels: Record<string, string>;
  brand: { title: string; sub: string };
  logoutLabel: string;
}

function NavList({ allowed, labels, collapsed, onNavigate }: Props & { collapsed: boolean; onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <ul className="space-y-1">
      {ADMIN_NAV.filter((n) => allowed.includes(n.key)).map(({ key, href, icon: Icon }) => {
        const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
        return (
          <li key={key}>
            <Link
              href={href}
              onClick={onNavigate}
              title={collapsed ? labels[key] : undefined}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition",
                active ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon className="size-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{labels[key]}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AdminSidebar(props: Props) {
  const [collapsed, setCollapsed] = useStoredFlag("admin-sidebar");
  const toggle = () => setCollapsed(!collapsed);

  return (
    <aside className={cn("sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-3 transition-[width] lg:flex", collapsed ? "w-[72px]" : "w-64")}>
      <div className={cn("mb-4 flex items-center", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && <Logo title={props.brand.title} sub={props.brand.sub} />}
        <Button variant="ghost" size="icon" className="rounded-full" onClick={toggle} aria-label="Toggle sidebar">
          <ChevronsLeft className={cn("size-4 transition", collapsed && "rotate-180")} />
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto">
        <NavList {...props} collapsed={collapsed} />
      </nav>
      <form action={logoutAction}>
        <Button variant="ghost" className={cn("w-full justify-start rounded-2xl", collapsed && "justify-center")}>
          <LogOut className="size-4" />
          {!collapsed && props.logoutLabel}
        </Button>
      </form>
    </aside>
  );
}

export function AdminMobileNav(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full lg:hidden" aria-label="Menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-sidebar p-3">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <div className="mb-4 mt-2"><Logo title={props.brand.title} sub={props.brand.sub} /></div>
        <NavList {...props} collapsed={false} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
