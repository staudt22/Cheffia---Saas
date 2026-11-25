import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { createClient } from "@/lib/supabase/server";
import type { PermissionMap } from "@/lib/permissions";
import { EXPENSE_LABELS } from "@/lib/validation";
import { zonedToUtc } from "@/lib/dates";

/*
 * The assistant's ONLY window on the world: read-only queries against this
 * restaurant's own data, run with the signed-in user's session so Row Level
 * Security and the user's permissions apply. There is deliberately no web
 * search, no fetch, and no access to any other restaurant or outside source.
 */

type Supa = Awaited<ReturnType<typeof createClient>>;
type Ctx = { supabase: Supa; restaurantId: string; permissions: PermissionMap; timezone: string; today: string };

const dateRange = {
  type: "object" as const,
  properties: {
    de: { type: "string", description: "Data inicial, formato AAAA-MM-DD (inclusiva)." },
    ate: { type: "string", description: "Data final, formato AAAA-MM-DD (inclusiva)." },
  },
  required: ["de", "ate"],
};

export const ASSISTANT_TOOLS: Anthropic.Tool[] = [
  { name: "resumo_do_periodo", description: "Faturamento, despesas, lucro estimado e número de pedidos (concluídos e cancelados) do restaurante num período.", input_schema: dateRange },
  { name: "vendas_por_dia", description: "Faturamento, despesas e pedidos dia a dia num período (máximo 92 dias).", input_schema: dateRange },
  { name: "produtos_mais_vendidos", description: "Itens do cardápio vendidos no período: quantidade, faturamento, custo dos ingredientes e margem. Ordenado por faturamento.", input_schema: dateRange },
  { name: "despesas_por_categoria", description: "Despesas do período agrupadas por categoria (ingredientes, salários, aluguel etc.).", input_schema: dateRange },
  { name: "estoque_atual", description: "Itens do estoque com quantidade atual, mínimo, custo e validade. Use somente_baixos=true para ver só o que está acabando.", input_schema: { type: "object", properties: { somente_baixos: { type: "boolean" } } } },
  { name: "margens_do_cardapio", description: "Preço, custo dos ingredientes (pela ficha técnica) e margem de cada item do cardápio.", input_schema: { type: "object", properties: {} } },
  { name: "desempenho_da_equipe", description: "Por pessoa no período: pedidos lançados, mesas atendidas, itens, comandas fechadas e valor vendido.", input_schema: dateRange },
  { name: "horas_da_equipe", description: "Horas trabalhadas por pessoa no período (ponto eletrônico) e quem está no turno agora.", input_schema: dateRange },
  { name: "pedidos_em_andamento", description: "Pedidos que ainda não foram concluídos nem cancelados, com status e há quanto tempo foram feitos.", input_schema: { type: "object", properties: {} } },
  { name: "contas_fixas", description: "Despesas recorrentes (aluguel, salários, contas) com valor e próximo vencimento.", input_schema: { type: "object", properties: {} } },
];

const NEED: Record<string, (p: PermissionMap) => boolean> = {
  resumo_do_periodo: (p) => p.finances.view || p.overview.view,
  vendas_por_dia: (p) => p.finances.view || p.overview.view,
  produtos_mais_vendidos: (p) => p.menu.view || p.overview.view,
  despesas_por_categoria: (p) => p.finances.view,
  estoque_atual: (p) => p.inventory.view,
  margens_do_cardapio: (p) => p.menu.view,
  desempenho_da_equipe: (p) => p.orders.view && p.team.view,
  horas_da_equipe: (p) => p.team.view,
  pedidos_em_andamento: (p) => p.orders.view,
  contas_fixas: (p) => p.finances.view,
};

/** Tools this user is allowed to use (others are not even offered to the model). */
export function toolsFor(permissions: PermissionMap) {
  return ASSISTANT_TOOLS.filter((t) => NEED[t.name]?.(permissions));
}

const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const round = (v: unknown) => Math.round(Number(v ?? 0) * 100) / 100;

export async function runTool(name: string, input: Record<string, unknown>, ctx: Ctx): Promise<unknown> {
  if (!NEED[name]?.(ctx.permissions)) return { erro: "Sem permissão para estes dados com o seu cargo." };
  const { supabase, restaurantId: rid } = ctx;
  let de = input.de, ate = input.ate;
  if ("de" in input || "ate" in input) {
    if (!isDate(de) || !isDate(ate)) return { erro: "Datas inválidas. Use AAAA-MM-DD." };
    if (de > ate) [de, ate] = [ate, de];
  }
  const range = { p_restaurant: rid, p_from: de as string, p_to: ate as string };
  // timestamp bounds in the restaurant's own time zone
  const tsRange = () => ({ p_restaurant: rid, p_from: zonedToUtc(`${de}T00:00`, ctx.timezone).toISOString(), p_to: new Date(zonedToUtc(`${ate}T00:00`, ctx.timezone).getTime() + 86400000).toISOString() });

  switch (name) {
    case "resumo_do_periodo": {
      const { data, error } = await supabase.rpc("period_totals", range).single();
      if (error) return { erro: "Não foi possível ler os dados." };
      const d = data as { revenue: number; expenses: number; orders: number; cancelled: number };
      return { periodo: { de, ate }, faturamento: round(d.revenue), despesas: round(d.expenses), lucro_estimado: round(Number(d.revenue) - Number(d.expenses)), pedidos_concluidos: Number(d.orders), pedidos_cancelados: Number(d.cancelled) };
    }
    case "vendas_por_dia": {
      const days = (Date.parse(ate as string) - Date.parse(de as string)) / 86400000;
      if (days > 92) return { erro: "Período longo demais; use no máximo 92 dias." };
      const { data, error } = await supabase.rpc("daily_series", range);
      if (error) return { erro: "Não foi possível ler os dados." };
      return (data as { day: string; revenue: number; expenses: number; orders: number }[]).map((r) => ({ dia: r.day, faturamento: round(r.revenue), despesas: round(r.expenses), pedidos: Number(r.orders) }));
    }
    case "produtos_mais_vendidos": {
      const { data, error } = await supabase.rpc("product_performance", range);
      if (error) return { erro: "Não foi possível ler os dados." };
      return (data as { name: string; quantity: number; revenue: number; food_cost: number; margin: number | null; has_recipe: boolean }[])
        .sort((a, b) => Number(b.revenue) - Number(a.revenue)).slice(0, 25)
        .map((r) => ({ item: r.name, quantidade: Number(r.quantity), faturamento: round(r.revenue), custo_ingredientes: r.has_recipe ? round(r.food_cost) : null, margem_percentual: r.has_recipe && r.margin != null ? round(r.margin) : null }));
    }
    case "despesas_por_categoria": {
      const { data, error } = await supabase.rpc("expense_breakdown", range);
      if (error) return { erro: "Não foi possível ler os dados." };
      return (data as { category: keyof typeof EXPENSE_LABELS; amount: number; entries: number }[]).map((r) => ({ categoria: EXPENSE_LABELS[r.category] ?? r.category, valor: round(r.amount), lancamentos: Number(r.entries) }));
    }
    case "estoque_atual": {
      const { data, error } = await supabase.from("inventory_items").select("name, quantity, unit, min_quantity, unit_cost, expires_on").eq("restaurant_id", rid).order("name").limit(300);
      if (error) return { erro: "Não foi possível ler os dados." };
      const rows = (data ?? []).map((r) => ({ item: r.name, quantidade: Number(r.quantity), unidade: r.unit === "unit" ? "un" : r.unit === "box" ? "caixa" : r.unit, minimo: Number(r.min_quantity), custo_unitario: round(r.unit_cost), validade: r.expires_on, abaixo_do_minimo: Number(r.quantity) <= Number(r.min_quantity) }));
      return input.somente_baixos ? rows.filter((r) => r.abaixo_do_minimo) : rows;
    }
    case "margens_do_cardapio": {
      const [{ data: items }, { data: costs }] = await Promise.all([
        supabase.from("menu_items").select("id, name, price, is_available").eq("restaurant_id", rid).limit(300),
        supabase.from("menu_item_costs").select("menu_item_id, food_cost, ingredient_count").eq("restaurant_id", rid),
      ]);
      const byId = new Map((costs ?? []).map((c) => [c.menu_item_id, c]));
      return (items ?? []).map((i) => {
        const c = byId.get(i.id);
        const hasRecipe = Number(c?.ingredient_count ?? 0) > 0;
        const cost = Number(c?.food_cost ?? 0);
        return { item: i.name, preco: round(i.price), disponivel: i.is_available, tem_ficha_tecnica: hasRecipe, custo_ingredientes: hasRecipe ? round(cost) : null, margem_percentual: hasRecipe && Number(i.price) > 0 ? round(((Number(i.price) - cost) / Number(i.price)) * 100) : null };
      });
    }
    case "desempenho_da_equipe": {
      const { data, error } = await supabase.rpc("staff_performance", tsRange());
      if (error) return { erro: "Não foi possível ler os dados." };
      return (data as Record<string, unknown>[]).map((r) => ({ pessoa: r.full_name, pedidos: Number(r.orders), concluidos: Number(r.completed), cancelados: Number(r.cancelled), mesas: Number(r.tables), itens: Number(r.items), comandas_fechadas: Number(r.tabs_closed), vendido: round(r.revenue) }));
    }
    case "horas_da_equipe": {
      const { data, error } = await supabase.rpc("team_hours", tsRange());
      if (error) return { erro: "Não foi possível ler os dados." };
      return (data as Record<string, unknown>[]).map((r) => ({ pessoa: r.full_name, funcao: r.job_title, horas: round(Number(r.minutes) / 60), registros: Number(r.entries), no_turno_agora: !!r.on_shift_since }));
    }
    case "pedidos_em_andamento": {
      const { data, error } = await supabase.from("orders").select("number, status, source, table_label, customer_name, total, created_at").eq("restaurant_id", rid).in("status", ["new", "preparing", "ready"]).order("created_at").limit(50);
      if (error) return { erro: "Não foi possível ler os dados." };
      const label: Record<string, string> = { new: "novo", preparing: "em preparo", ready: "pronto" };
      const now = Date.now();
      return (data ?? []).map((o) => ({ pedido: o.number, status: label[o.status] ?? o.status, mesa_ou_cliente: o.table_label ?? o.customer_name, total: round(o.total), minutos_desde_o_pedido: Math.round((now - new Date(o.created_at).getTime()) / 60000) }));
    }
    case "contas_fixas": {
      const { data, error } = await supabase.from("expenses").select("description, category, amount, recurrence, next_due_on").eq("restaurant_id", rid).eq("is_recurring", true).is("recurring_parent_id", null).order("next_due_on").limit(100);
      if (error) return { erro: "Não foi possível ler os dados." };
      return (data ?? []).map((e) => ({ conta: e.description, categoria: EXPENSE_LABELS[e.category as keyof typeof EXPENSE_LABELS] ?? e.category, valor: round(e.amount), repeticao: e.recurrence, proximo_vencimento: e.next_due_on }));
    }
  }
  return { erro: "Ferramenta desconhecida." };
}
