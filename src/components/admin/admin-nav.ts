import {
  BadgeDollarSign, BarChart3, Boxes, CreditCard, LayoutDashboard, Package, Receipt, Settings, ShoppingCart,
  Store, Tags, TrendingUp, Truck, Users, UserCog,
} from "lucide-react";
import type { Permission } from "@/features/auth/permissions";
import type { Dictionary } from "@/i18n/dictionaries";

export type AdminModule = keyof Dictionary["admin"]["menu"];

export const ADMIN_NAV: { key: AdminModule; href: string; icon: typeof Package; perm?: Permission; phase: number }[] = [
  { key: "dashboard", href: "/admin", icon: LayoutDashboard, phase: 1 },
  { key: "products", href: "/admin/products", icon: Package, perm: "product.view", phase: 2 },
  { key: "categories", href: "/admin/categories", icon: Tags, perm: "product.edit", phase: 2 },
  { key: "pricing", href: "/admin/pricing", icon: BadgeDollarSign, perm: "price.edit", phase: 2 },
  { key: "customers", href: "/admin/customers", icon: Users, perm: "customer.view", phase: 2 },
  { key: "wholesaleCustomers", href: "/admin/wholesale", icon: Store, perm: "wholesale.approve", phase: 2 },
  { key: "orders", href: "/admin/orders", icon: ShoppingCart, perm: "order.view", phase: 3 },
  { key: "inventory", href: "/admin/inventory", icon: Boxes, perm: "inventory.view", phase: 4 },
  { key: "deliveries", href: "/admin/deliveries", icon: Truck, perm: "delivery.view", phase: 4 },
  { key: "payments", href: "/admin/payments", icon: CreditCard, perm: "payment.confirm", phase: 5 },
  { key: "expenses", href: "/admin/expenses", icon: Receipt, perm: "expense.record", phase: 5 },
  { key: "pnl", href: "/admin/pnl", icon: TrendingUp, perm: "report.profit", phase: 5 },
  { key: "reports", href: "/admin/reports", icon: BarChart3, perm: "report.sales", phase: 6 },
  { key: "users", href: "/admin/users", icon: UserCog, perm: "user.manage", phase: 2 },
  { key: "settings", href: "/admin/settings", icon: Settings, perm: "settings.manage", phase: 6 },
];
