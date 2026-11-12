/**
 * RBAC source of truth. Seeded into roles/permissions tables, and used by
 * `requirePermission()` on every server action and route handler.
 */

export const PERMISSIONS = {
  "product.view": "View products (admin)",
  "product.edit": "Create / edit products",
  "price.edit": "Change prices and price lists",
  "cost.view": "View cost prices and COGS",
  "customer.view": "View customer contact details",
  "customer.edit": "Create / edit customers",
  "wholesale.approve": "Approve wholesale accounts",
  "order.view": "View orders",
  "order.manage": "Create / edit / confirm / cancel orders",
  "payment.confirm": "Verify payments and issue refunds",
  "inventory.view": "View inventory",
  "inventory.adjust": "Stock in / adjust / write off",
  "delivery.view": "View deliveries",
  "delivery.update": "Update delivery status",
  "delivery.fees": "Manage delivery zones and fees",
  "expense.record": "Record expenses",
  "expense.approve": "Approve expenses",
  "report.profit": "View profit & loss reports",
  "report.sales": "View sales reports",
  "user.manage": "Manage users and roles",
  "settings.manage": "Configure system settings",
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ROLES = {
  SUPER_ADMIN: { km: "អ្នកគ្រប់គ្រងកំពូល", en: "Super Admin" },
  ADMIN: { km: "អ្នកគ្រប់គ្រង", en: "Administrator" },
  SALES_MANAGER: { km: "ប្រធានផ្នែកលក់", en: "Sales Manager" },
  SALES_STAFF: { km: "បុគ្គលិកលក់", en: "Sales Staff" },
  INVENTORY_MANAGER: { km: "អ្នកគ្រប់គ្រងស្តុក", en: "Inventory Manager" },
  DELIVERY_STAFF: { km: "បុគ្គលិកដឹកជញ្ជូន", en: "Delivery Staff" },
  ACCOUNTANT: { km: "គណនេយ្យករ", en: "Accountant" },
  RETAIL_CUSTOMER: { km: "អតិថិជនរាយ", en: "Retail Customer" },
  WHOLESALE_CUSTOMER: { km: "អតិថិជនដុំ", en: "Wholesale Customer" },
} as const;

export type RoleCode = keyof typeof ROLES;

const ALL = Object.keys(PERMISSIONS) as Permission[];

export const ROLE_PERMISSIONS: Record<RoleCode, Permission[]> = {
  SUPER_ADMIN: ALL,
  // Everything except system settings (Super Admin only).
  ADMIN: ALL.filter((p) => p !== "settings.manage"),
  SALES_MANAGER: [
    "product.view",
    "price.edit",
    "customer.view",
    "customer.edit",
    "wholesale.approve",
    "order.view",
    "order.manage",
    "payment.confirm",
    "inventory.view",
    "delivery.view",
    "report.sales",
  ],
  SALES_STAFF: ["product.view", "customer.view", "customer.edit", "order.view", "order.manage", "inventory.view", "delivery.view"],
  INVENTORY_MANAGER: ["product.view", "product.edit", "cost.view", "inventory.view", "inventory.adjust", "order.view"],
  DELIVERY_STAFF: ["delivery.view", "delivery.update"],
  ACCOUNTANT: [
    "product.view",
    "cost.view",
    "order.view",
    "payment.confirm",
    "expense.record",
    "expense.approve",
    "report.profit",
    "report.sales",
    "inventory.view",
  ],
  RETAIL_CUSTOMER: [],
  WHOLESALE_CUSTOMER: [],
};

export const STAFF_ROLES: RoleCode[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "SALES_MANAGER",
  "SALES_STAFF",
  "INVENTORY_MANAGER",
  "DELIVERY_STAFF",
  "ACCOUNTANT",
];

export function permissionsFor(roles: readonly string[]): Set<Permission> {
  const set = new Set<Permission>();
  for (const r of roles) {
    for (const p of ROLE_PERMISSIONS[r as RoleCode] ?? []) set.add(p);
  }
  return set;
}

export function hasPermission(roles: readonly string[], perm: Permission): boolean {
  return permissionsFor(roles).has(perm);
}

export function isStaff(roles: readonly string[]): boolean {
  return roles.some((r) => STAFF_ROLES.includes(r as RoleCode));
}
