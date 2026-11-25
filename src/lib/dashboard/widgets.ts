import type { Section, WidgetInstance } from "@/lib/types";

export type WidgetType =
  | "kpi_revenue" | "kpi_today_revenue" | "kpi_week_revenue" | "kpi_month_revenue"
  | "kpi_expenses" | "kpi_profit" | "kpi_orders" | "kpi_aov"
  | "revenue_chart" | "expense_breakdown" | "expense_chart" | "popular_products" | "order_activity"
  | "inventory_alerts" | "alerts" | "recent_activity" | "recent_transactions" | "upcoming_shifts" | "ai_insights";

export interface WidgetDef {
  type: WidgetType;
  title: string;
  description: string;
  section: Section;
  sizes: WidgetInstance["size"][];
  defaultSize: WidgetInstance["size"];
  charts?: ("area" | "bar" | "line")[];
  group: "Números principais" | "Gráficos" | "Operação" | "Análises";
  help?: string;
}

export const WIDGETS: WidgetDef[] = [
  { type: "kpi_revenue", title: "Faturamento", description: "Total que entrou no período escolhido", section: "finances", sizes: ["sm", "md"], defaultSize: "sm", group: "Números principais" },
  { type: "kpi_expenses", title: "Despesas", description: "Total gasto no período escolhido", section: "finances", sizes: ["sm", "md"], defaultSize: "sm", group: "Números principais" },
  { type: "kpi_profit", title: "Lucro estimado", description: "Faturamento menos despesas", section: "finances", sizes: ["sm", "md"], defaultSize: "sm", group: "Números principais" },
  { type: "kpi_orders", title: "Pedidos", description: "Pedidos concluídos no período", section: "orders", sizes: ["sm", "md"], defaultSize: "sm", group: "Números principais" },
  { type: "kpi_aov", title: "Ticket médio", description: "Valor médio de cada pedido", section: "orders", sizes: ["sm", "md"], defaultSize: "sm", group: "Números principais" },
  { type: "kpi_today_revenue", title: "Faturamento de hoje", description: "O que entrou hoje", section: "finances", sizes: ["sm", "md"], defaultSize: "sm", group: "Números principais" },
  { type: "kpi_week_revenue", title: "Faturamento da semana", description: "Últimos 7 dias", section: "finances", sizes: ["sm", "md"], defaultSize: "sm", group: "Números principais" },
  { type: "kpi_month_revenue", title: "Faturamento do mês", description: "Desde o dia 1º", section: "finances", sizes: ["sm", "md"], defaultSize: "sm", group: "Números principais" },
  { type: "revenue_chart", title: "Gráfico de faturamento", description: "Faturamento por hora, dia, semana ou mês", section: "finances", sizes: ["md", "lg", "xl"], defaultSize: "lg", charts: ["area", "bar", "line"], group: "Gráficos" },
  { type: "expense_chart", title: "Faturamento x despesas", description: "Entradas e saídas dia a dia", section: "finances", sizes: ["md", "lg", "xl"], defaultSize: "lg", charts: ["line", "bar"], group: "Gráficos" },
  { type: "expense_breakdown", title: "Para onde vai o dinheiro", description: "Despesas por categoria", section: "finances", sizes: ["md", "lg"], defaultSize: "md", group: "Gráficos" },
  { type: "popular_products", title: "Mais vendidos", description: "Produtos campeões com faturamento e margem", section: "orders", sizes: ["md", "lg"], defaultSize: "md", group: "Operação" },
  { type: "order_activity", title: "Pedidos em andamento", description: "O que está sendo preparado agora", section: "orders", sizes: ["md", "lg"], defaultSize: "md", group: "Operação" },
  { type: "inventory_alerts", title: "Alertas de estoque", description: "Itens acabando ou vencendo", section: "inventory", sizes: ["md", "lg"], defaultSize: "md", group: "Operação" },
  { type: "recent_transactions", title: "Últimos lançamentos", description: "Entradas e saídas mais recentes", section: "finances", sizes: ["md", "lg"], defaultSize: "md", group: "Operação" },
  { type: "upcoming_shifts", title: "Próximos turnos", description: "Quem trabalha a seguir", section: "team", sizes: ["md", "lg"], defaultSize: "md", group: "Operação" },
  { type: "alerts", title: "Avisos", description: "Tudo que precisa da sua atenção", section: "overview", sizes: ["md", "lg"], defaultSize: "md", group: "Análises" },
  { type: "recent_activity", title: "Atividade recente", description: "O que aconteceu no restaurante", section: "overview", sizes: ["md", "lg"], defaultSize: "md", group: "Análises" },
  { type: "ai_insights", title: "Dicas do CheffeData", description: "Observações calculadas com os seus números", section: "overview", sizes: ["md", "lg"], defaultSize: "md", group: "Análises" },
];

export const WIDGET_HELP: Record<string, string> = {
  kpi_revenue: "Todo o dinheiro que entrou no período: pedidos concluídos e as receitas que você lançou à mão (eventos, encomendas…).",
  kpi_expenses: "Tudo o que você lançou como gasto no período: ingredientes, aluguel, salários, contas etc.",
  kpi_profit: "Faturamento menos despesas. É uma estimativa: fica mais certa quanto mais despesas você lançar.",
  kpi_orders: "Quantos pedidos foram concluídos no período. Pedidos cancelados não entram na conta.",
  kpi_aov: "Ticket médio: quanto cada pedido vale, em média. Aumentar o ticket costuma ser mais fácil do que conseguir clientes novos.",
  kpi_today_revenue: "O que entrou hoje, comparado com o mesmo dia da semana passada.",
  kpi_week_revenue: "Os últimos 7 dias, comparados com os 7 dias anteriores.",
  kpi_month_revenue: "Desde o dia 1º deste mês, comparado com os mesmos dias do mês passado.",
  revenue_chart: "Mostra como o faturamento muda com o tempo. Troque entre hora, dia, semana e mês para descobrir seus horários mais fortes.",
  expense_chart: "Entradas (azul) e saídas (rosa) dia a dia. Quando a linha rosa passa da azul, o dia gastou mais do que ganhou.",
  expense_breakdown: "Quais categorias levam a maior parte do seu dinheiro. Ingredientes e equipe costumam ser as maiores.",
  popular_products: "Seus campeões de venda. Margem = quanto sobra do preço depois do custo dos ingredientes (precisa da ficha técnica). Acima de 65% é saudável.",
  order_activity: "Pedidos que ainda estão em andamento: novos, aceitos, em preparo ou prontos.",
  inventory_alerts: "Itens abaixo do mínimo que você definiu, zerados ou vencendo nos próximos 3 dias.",
  alerts: "O que precisa da sua atenção: estoque, gastos fora do normal, contas chegando e informações faltando.",
  recent_activity: "Tudo o que acontece no restaurante: pedidos, despesas, estoque e mais.",
  recent_transactions: "As entradas (em verde) e saídas mais recentes.",
  upcoming_shifts: "Quem está escalado para trabalhar a seguir.",
  ai_insights: "Observações em linguagem simples, calculadas com os seus números. Nada aqui é inventado.",
};

export const widgetDef = (type: string) => WIDGETS.find((w) => w.type === type);

let seq = 0;
export const newWidgetId = (type: string) => `${type.replace(/_/g, "-")}-${Date.now().toString(36)}${(seq++).toString(36)}`;

const w = (type: WidgetType, size?: WidgetInstance["size"], config?: WidgetInstance["config"]): WidgetInstance => ({
  id: type.replace(/_/g, "-"),
  type,
  size: size ?? widgetDef(type)!.defaultSize,
  ...(config ? { config } : {}),
});

export const DASHBOARD_PRESETS = {
  owner: {
    name: "Visão do dono",
    description: "Dinheiro, pedidos e avisos — o quadro completo.",
    widgets: [
      w("kpi_revenue"), w("kpi_expenses"), w("kpi_profit"), w("kpi_orders"),
      w("revenue_chart", "xl", { chart: "area" }), w("expense_breakdown", "md"),
      w("popular_products"), w("alerts"), w("recent_activity"), w("ai_insights"), w("recent_transactions"),
    ],
  },
  operations: {
    name: "Operação",
    description: "Pedidos ao vivo, estoque e equipe no turno.",
    widgets: [
      w("kpi_orders"), w("kpi_aov"), w("kpi_today_revenue"), w("kpi_week_revenue"),
      w("order_activity", "md"), w("inventory_alerts"), w("popular_products"), w("upcoming_shifts"), w("recent_activity"), w("alerts"),
    ],
  },
  finance: {
    name: "Financeiro",
    description: "Faturamento, custos e margens em primeiro lugar.",
    widgets: [
      w("kpi_revenue"), w("kpi_expenses"), w("kpi_profit"), w("kpi_aov"),
      w("expense_chart", "xl", { chart: "line" }), w("expense_breakdown", "md"), w("recent_transactions"),
      w("popular_products"), w("ai_insights"),
    ],
  },
} satisfies Record<string, { name: string; description: string; widgets: WidgetInstance[] }>;

export type PresetKey = keyof typeof DASHBOARD_PRESETS;
