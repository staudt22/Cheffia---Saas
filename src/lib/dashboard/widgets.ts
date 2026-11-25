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
  group: "Key numbers" | "Charts" | "Operations" | "Insights";
  help?: string;
}

export const WIDGETS: WidgetDef[] = [
  { type: "kpi_revenue", title: "Revenue", description: "Total revenue for the selected period", section: "finances", sizes: ["sm", "md"], defaultSize: "sm", group: "Key numbers" },
  { type: "kpi_expenses", title: "Expenses", description: "Total expenses for the selected period", section: "finances", sizes: ["sm", "md"], defaultSize: "sm", group: "Key numbers" },
  { type: "kpi_profit", title: "Estimated profit", description: "Revenue minus expenses", section: "finances", sizes: ["sm", "md"], defaultSize: "sm", group: "Key numbers" },
  { type: "kpi_orders", title: "Orders", description: "Completed orders in the period", section: "orders", sizes: ["sm", "md"], defaultSize: "sm", group: "Key numbers" },
  { type: "kpi_aov", title: "Average order value", description: "Order revenue per completed order", section: "orders", sizes: ["sm", "md"], defaultSize: "sm", group: "Key numbers" },
  { type: "kpi_today_revenue", title: "Today's revenue", description: "Revenue recorded today", section: "finances", sizes: ["sm", "md"], defaultSize: "sm", group: "Key numbers" },
  { type: "kpi_week_revenue", title: "Weekly revenue", description: "Revenue for the last 7 days", section: "finances", sizes: ["sm", "md"], defaultSize: "sm", group: "Key numbers" },
  { type: "kpi_month_revenue", title: "Monthly revenue", description: "Revenue for the current month", section: "finances", sizes: ["sm", "md"], defaultSize: "sm", group: "Key numbers" },
  { type: "revenue_chart", title: "Revenue", description: "Revenue over time — hourly, daily, weekly or monthly", section: "finances", sizes: ["md", "lg", "xl"], defaultSize: "lg", charts: ["area", "bar", "line"], group: "Charts" },
  { type: "expense_chart", title: "Revenue vs expenses", description: "Daily revenue and expenses side by side", section: "finances", sizes: ["md", "lg", "xl"], defaultSize: "lg", charts: ["line", "bar"], group: "Charts" },
  { type: "expense_breakdown", title: "Expense breakdown", description: "Where the money goes, by category", section: "finances", sizes: ["md", "lg"], defaultSize: "md", group: "Charts" },
  { type: "popular_products", title: "Popular products", description: "Best sellers with revenue and estimated margin", section: "orders", sizes: ["md", "lg"], defaultSize: "md", group: "Operations" },
  { type: "order_activity", title: "Order activity", description: "Orders currently in progress", section: "orders", sizes: ["md", "lg"], defaultSize: "md", group: "Operations" },
  { type: "inventory_alerts", title: "Inventory alerts", description: "Low stock and expiring items", section: "inventory", sizes: ["md", "lg"], defaultSize: "md", group: "Operations" },
  { type: "recent_transactions", title: "Recent transactions", description: "Latest revenue and expenses", section: "finances", sizes: ["md", "lg"], defaultSize: "md", group: "Operations" },
  { type: "upcoming_shifts", title: "Upcoming shifts", description: "Who is working next", section: "team", sizes: ["md", "lg"], defaultSize: "md", group: "Operations" },
  { type: "alerts", title: "Alerts", description: "Everything that needs your attention", section: "overview", sizes: ["md", "lg"], defaultSize: "md", group: "Insights" },
  { type: "recent_activity", title: "Recent activity", description: "Latest events across the restaurant", section: "overview", sizes: ["md", "lg"], defaultSize: "md", group: "Insights" },
  { type: "ai_insights", title: "Insights", description: "Observations computed from your own data", section: "overview", sizes: ["md", "lg"], defaultSize: "md", group: "Insights" },
];

export const WIDGET_HELP: Record<string, string> = {
  kpi_revenue: "All money that came in during the period: completed orders plus any revenue you recorded manually (catering, events…).",
  kpi_expenses: "Everything you recorded as spent in the period: ingredients, rent, salaries, bills and so on.",
  kpi_profit: "Revenue minus expenses. It's an estimate — it's only as complete as the expenses you record.",
  kpi_orders: "How many orders were completed in the period. Cancelled orders are not counted.",
  kpi_aov: "Average order value: order revenue divided by the number of completed orders. Raising it is often easier than finding new customers.",
  kpi_today_revenue: "Revenue recorded today, compared with the same weekday last week.",
  kpi_week_revenue: "Revenue for the last 7 days, compared with the 7 days before.",
  kpi_month_revenue: "Revenue since the 1st of this month, compared with the same days last month.",
  revenue_chart: "Shows how revenue moves over time. Switch between hourly, daily, weekly and monthly to spot your busiest moments.",
  expense_chart: "Revenue and expenses day by day. When the pink line is above the blue one, that day cost more than it earned.",
  expense_breakdown: "Which categories take the biggest share of your spending. Ingredients and staff are usually the largest.",
  popular_products: "Your best sellers. Margin = how much of the price is left after ingredient cost (needs a recipe). Above 65% is healthy.",
  order_activity: "Orders that are still being handled: new, accepted, preparing or ready.",
  inventory_alerts: "Items below the minimum you set, out of stock, or expiring within 3 days.",
  alerts: "Things that need your attention: stock, unusual spending, bills coming up and missing information.",
  recent_activity: "A live log of what's happening: new orders, expenses, stock changes and more.",
  recent_transactions: "The latest money in (green) and money out.",
  upcoming_shifts: "Who is scheduled to work next.",
  ai_insights: "Plain-language observations calculated from your own numbers. Nothing here is guessed.",
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
    name: "Owner overview",
    description: "Money, orders and alerts — the full picture.",
    widgets: [
      w("kpi_revenue"), w("kpi_expenses"), w("kpi_profit"), w("kpi_orders"),
      w("revenue_chart", "xl", { chart: "area" }), w("expense_breakdown", "md"),
      w("popular_products"), w("alerts"), w("recent_activity"), w("ai_insights"), w("recent_transactions"),
    ],
  },
  operations: {
    name: "Operations",
    description: "Live orders, stock and the team on shift.",
    widgets: [
      w("kpi_orders"), w("kpi_aov"), w("kpi_today_revenue"), w("kpi_week_revenue"),
      w("order_activity", "md"), w("inventory_alerts"), w("popular_products"), w("upcoming_shifts"), w("recent_activity"), w("alerts"),
    ],
  },
  finance: {
    name: "Finance",
    description: "Revenue, costs and margins first.",
    widgets: [
      w("kpi_revenue"), w("kpi_expenses"), w("kpi_profit"), w("kpi_aov"),
      w("expense_chart", "xl", { chart: "line" }), w("expense_breakdown", "md"), w("recent_transactions"),
      w("popular_products"), w("ai_insights"),
    ],
  },
} satisfies Record<string, { name: string; description: string; widgets: WidgetInstance[] }>;

export type PresetKey = keyof typeof DASHBOARD_PRESETS;
