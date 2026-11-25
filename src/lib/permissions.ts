import type { AppRole, Section } from "@/lib/types";

export const SECTIONS: { key: Section; label: string; description: string }[] = [
  { key: "overview", label: "Overview", description: "Main dashboard" },
  { key: "orders", label: "Orders", description: "Orders and kitchen display" },
  { key: "finances", label: "Finances", description: "Revenue, expenses and transactions" },
  { key: "inventory", label: "Inventory", description: "Stock, movements and alerts" },
  { key: "menu", label: "Menu", description: "Products, prices and recipes" },
  { key: "suppliers", label: "Suppliers", description: "Suppliers and purchase orders" },
  { key: "team", label: "Team", description: "Employees, invitations and shifts" },
  { key: "analytics", label: "Analytics", description: "Reports and trends" },
  { key: "assistant", label: "AI Assistant", description: "Ask questions about your data" },
  { key: "integrations", label: "Integrations", description: "External platforms" },
  { key: "settings", label: "Settings", description: "Restaurant identity and preferences" },
];

export const ROLES: { key: AppRole; label: string; description: string }[] = [
  { key: "owner", label: "Owner", description: "Full access to everything, including billing and permissions" },
  { key: "manager", label: "Manager", description: "Runs daily operations" },
  { key: "employee", label: "Employee", description: "Takes and updates orders" },
  { key: "accountant", label: "Accountant", description: "Works with finances and reports" },
  { key: "kitchen", label: "Kitchen staff", description: "Uses the kitchen display" },
];

export const roleLabel = (role: AppRole) => ROLES.find((r) => r.key === role)?.label ?? role;

export type PermissionMap = Record<Section, { view: boolean; edit: boolean }>;

export function buildPermissionMap(
  role: AppRole,
  rows: { section: string; can_view: boolean; can_edit: boolean }[],
): PermissionMap {
  const map = {} as PermissionMap;
  for (const s of SECTIONS) {
    if (role === "owner") {
      map[s.key] = { view: true, edit: true };
    } else {
      const row = rows.find((r) => r.section === s.key);
      map[s.key] = { view: Boolean(row?.can_view), edit: Boolean(row?.can_edit) };
    }
  }
  return map;
}
