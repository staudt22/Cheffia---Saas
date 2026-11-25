import type { AppRole, Section } from "@/lib/types";

export const SECTIONS: { key: Section; label: string; description: string }[] = [
  { key: "overview", label: "Visão geral", description: "Painel principal" },
  { key: "orders", label: "Pedidos", description: "Pedidos e tela da cozinha" },
  { key: "finances", label: "Finanças", description: "Receitas, despesas e lançamentos" },
  { key: "inventory", label: "Estoque", description: "Itens, movimentações e alertas" },
  { key: "menu", label: "Cardápio", description: "Produtos, preços e fichas técnicas" },
  { key: "suppliers", label: "Fornecedores", description: "Fornecedores e pedidos de compra" },
  { key: "team", label: "Equipe", description: "Funcionários, convites e escalas" },
  { key: "analytics", label: "Relatórios", description: "Relatórios e tendências" },
  { key: "assistant", label: "Assistente IA", description: "Pergunte sobre os seus números" },
  { key: "integrations", label: "Integrações", description: "Plataformas externas" },
  { key: "settings", label: "Configurações", description: "Identidade e preferências do restaurante" },
];

export const ROLES: { key: AppRole; label: string; description: string }[] = [
  { key: "owner", label: "Dono", description: "Acesso total, incluindo plano e permissões" },
  { key: "manager", label: "Gerente", description: "Cuida da operação do dia a dia" },
  { key: "employee", label: "Funcionário", description: "Lança e atualiza pedidos" },
  { key: "accountant", label: "Contador", description: "Trabalha com finanças e relatórios" },
  { key: "kitchen", label: "Cozinha", description: "Usa a tela da cozinha" },
];

export const roleLabel = (role: AppRole) => ROLES.find((r) => r.key === role)?.label ?? role;

/** First page a member can open — kitchen staff land on the kitchen display. */
export function homePath(p: PermissionMap): string {
  if (p.overview.view) return "/dashboard";
  if (p.orders.view) return "/orders/kitchen";
  const order: [keyof PermissionMap, string][] = [["finances", "/finances"], ["inventory", "/inventory"], ["menu", "/menu"], ["integrations", "/integrations"], ["settings", "/settings"]];
  return order.find(([s]) => p[s]?.view)?.[1] ?? "/settings?tab=security";
}

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
