import "server-only";
import { addDays, format, parseISO, subMonths, subWeeks } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { todayIn, type DateRange } from "@/lib/dates";
import { EXPENSE_LABELS } from "@/lib/validation";
import type { Workspace } from "@/lib/workspace";
import type { ExpenseCategory, OrderStatus, OrderSource } from "@/lib/types";

type Num = number;
const n = (v: unknown) => Number(v ?? 0);

export interface Totals { revenue: Num; expenses: Num; orders: Num; cancelled: Num }
export interface SeriesPoint { label: string; date: string; revenue: Num; expenses?: Num; orders?: Num }

export interface Alert {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  href: string;
}

export interface DashboardData {
  range: DateRange;
  totals: Totals;
  previous: Totals;
  orderRevenue: { current: Num; previous: Num };
  quick: { today: Num; todayPrev: Num; week: Num; weekPrev: Num; month: Num; monthPrev: Num };
  daily: SeriesPoint[];
  revenueSeries: Record<"hour" | "day" | "week" | "month", SeriesPoint[]>;
  expenseBreakdown: { category: ExpenseCategory; label: string; amount: Num }[];
  products: { id: string | null; name: string; quantity: Num; revenue: Num; margin: Num | null }[];
  liveOrders: { id: string; number: Num; status: OrderStatus; source: OrderSource; is_simulated: boolean; created_at: string; total: Num; customer_name: string | null; table_label: string | null; items: Num }[];
  inventoryAlerts: { id: string; name: string; quantity: Num; min_quantity: Num; unit: string; expires_on: string | null; kind: "out" | "low" | "expiring" }[];
  activity: { id: Num; summary: string; action: string; created_at: string }[];
  transactions: { id: string; kind: "revenue" | "expense"; description: string; amount: Num; date: string; category: string }[];
  shifts: { id: string; employee: string; position: string | null; starts_at: string; ends_at: string }[];
  alerts: Alert[];
  insights: { id: string; text: string; tone: "good" | "bad" | "neutral" }[];
  hasAnyData: boolean;
}

function totalsFrom(row: Record<string, unknown> | undefined): Totals {
  return { revenue: n(row?.revenue), expenses: n(row?.expenses), orders: n(row?.orders), cancelled: n(row?.cancelled) };
}

export async function loadDashboardData(ws: Workspace, range: DateRange): Promise<DashboardData> {
  const supabase = await createClient();
  const rid = ws.restaurant.id;
  const tz = ws.restaurant.timezone;
  const today = todayIn(tz);
  const todayDate = parseISO(today);
  const can = (s: keyof Workspace["permissions"]) => ws.permissions[s].view;

  const sparkFrom = range.days < 7 ? format(addDays(parseISO(range.to), -13), "yyyy-MM-dd") : range.from;
  const dayFrom = range.days < 2 ? format(addDays(parseISO(range.to), -29), "yyyy-MM-dd") : range.from;
  const weekFrom = format(subWeeks(todayDate, 11), "yyyy-MM-dd");
  const monthFrom = format(subMonths(todayDate, 11), "yyyy-MM-01");
  const monthStart = format(todayDate, "yyyy-MM-01");
  const prevMonthStart = format(subMonths(todayDate, 1), "yyyy-MM-01");
  const prevMonthSameDay = format(subMonths(todayDate, 1), "yyyy-MM-dd");
  const d = (offset: number) => format(addDays(todayDate, offset), "yyyy-MM-dd");

  const rpcTotals = (from: string, to: string) => supabase.rpc("period_totals", { p_restaurant: rid, p_from: from, p_to: to }).single();
  const rpcSeries = (from: string, to: string, bucket: string) => supabase.rpc("revenue_series", { p_restaurant: rid, p_from: from, p_to: to, p_bucket: bucket });

  const [
    cur, prev, tdy, tdyPrev, wk, wkPrev, mo, moPrev,
    daily, sHour, sDay, sWeek, sMonth,
    breakdown, products, prevProducts, live, inventory, activity, revenueRows, expenseRows, shifts,
    recurringDue, menuNoRecipe, bigExpenses,
  ] = await Promise.all([
    rpcTotals(range.from, range.to),
    rpcTotals(range.prevFrom, range.prevTo),
    rpcTotals(today, today),
    rpcTotals(d(-7), d(-7)),
    rpcTotals(d(-6), today),
    rpcTotals(d(-13), d(-7)),
    rpcTotals(monthStart, today),
    rpcTotals(prevMonthStart, prevMonthSameDay),
    supabase.rpc("daily_series", { p_restaurant: rid, p_from: sparkFrom, p_to: range.to }),
    rpcSeries(range.from, range.to, "hour"),
    rpcSeries(dayFrom, range.to, "day"),
    rpcSeries(weekFrom, today, "week"),
    rpcSeries(monthFrom, today, "month"),
    supabase.rpc("expense_breakdown", { p_restaurant: rid, p_from: range.from, p_to: range.to }),
    supabase.rpc("product_performance", { p_restaurant: rid, p_from: range.from, p_to: range.to }),
    supabase.rpc("product_performance", { p_restaurant: rid, p_from: range.prevFrom, p_to: range.prevTo }),
    can("orders")
      ? supabase.from("orders").select("id, number, status, source, is_simulated, created_at, total, customer_name, table_label, order_items(count)")
          .eq("restaurant_id", rid).in("status", ["new", "accepted", "preparing", "ready"]).order("created_at").limit(12)
      : Promise.resolve({ data: [] }),
    can("inventory")
      ? supabase.from("inventory_items").select("id, name, quantity, min_quantity, unit, expires_on").eq("restaurant_id", rid)
      : Promise.resolve({ data: [] }),
    supabase.from("audit_logs").select("id, summary, action, created_at").eq("restaurant_id", rid).not("summary", "is", null).order("created_at", { ascending: false }).limit(8),
    can("finances")
      ? supabase.from("revenue_records").select("id, description, amount, date, source, created_at").eq("restaurant_id", rid).order("date", { ascending: false }).order("created_at", { ascending: false }).limit(8)
      : Promise.resolve({ data: [] }),
    can("finances")
      ? supabase.from("expenses").select("id, description, amount, date, category, created_at").eq("restaurant_id", rid).order("date", { ascending: false }).order("created_at", { ascending: false }).limit(8)
      : Promise.resolve({ data: [] }),
    can("team")
      ? supabase.from("shifts").select("id, starts_at, ends_at, position, employees(full_name, position)").eq("restaurant_id", rid).gte("ends_at", new Date().toISOString()).order("starts_at").limit(6)
      : Promise.resolve({ data: [] }),
    can("finances")
      ? supabase.from("expenses").select("id, description, amount, next_due_on").eq("restaurant_id", rid).eq("is_recurring", true).lte("next_due_on", d(7)).order("next_due_on")
      : Promise.resolve({ data: [] }),
    can("menu")
      ? supabase.from("menu_items").select("id, name, recipes(id, recipe_ingredients(count))").eq("restaurant_id", rid).eq("is_available", true)
      : Promise.resolve({ data: [] }),
    can("finances")
      ? supabase.from("expenses").select("id, description, amount, category, date").eq("restaurant_id", rid).gte("date", d(-90)).order("date", { ascending: false }).limit(1000)
      : Promise.resolve({ data: [] }),
  ]);

  const fmtLabel = (iso: string, bucket: string) => {
    const dt = parseISO(iso);
    return bucket === "hour" ? format(dt, "HH:00") : bucket === "month" ? format(dt, "MMM") : bucket === "week" ? format(dt, "MMM d") : format(dt, "MMM d");
  };
  const toSeries = (rows: unknown, bucket: "hour" | "day" | "week" | "month"): SeriesPoint[] => {
    const list = (rows as { bucket: string; revenue: unknown; orders: unknown }[] | null) ?? [];
    if (bucket === "hour") {
      const byHour = new Map<number, { revenue: number; orders: number }>();
      for (const r of list) {
        const h = parseISO(r.bucket).getHours();
        const e = byHour.get(h) ?? { revenue: 0, orders: 0 };
        e.revenue += n(r.revenue); e.orders += n(r.orders);
        byHour.set(h, e);
      }
      const hours = [...byHour.keys()];
      if (!hours.length) return [];
      const out: SeriesPoint[] = [];
      for (let h = Math.min(...hours); h <= Math.max(...hours); h++) {
        const e = byHour.get(h) ?? { revenue: 0, orders: 0 };
        out.push({ label: `${String(h).padStart(2, "0")}:00`, date: String(h), revenue: e.revenue, orders: e.orders });
      }
      return out;
    }
    return list.map((r) => ({ label: fmtLabel(r.bucket, bucket), date: r.bucket.slice(0, 10), revenue: n(r.revenue), orders: n(r.orders) }));
  };

  // Fill missing days so the daily chart has a continuous axis.
  const dayMap = new Map(toSeries(sDay.data, "day").map((p) => [p.date, p]));
  const dayFilled: SeriesPoint[] = [];
  for (let dt = parseISO(dayFrom); dt <= parseISO(range.to); dt = addDays(dt, 1)) {
    const key = format(dt, "yyyy-MM-dd");
    dayFilled.push(dayMap.get(key) ?? { label: format(dt, "MMM d"), date: key, revenue: 0, orders: 0 });
  }

  const totals = totalsFrom(cur.data as Record<string, unknown>);
  const previous = totalsFrom(prev.data as Record<string, unknown>);
  const productRows = ((products.data as Record<string, unknown>[] | null) ?? []).map((p) => ({
    id: (p.menu_item_id as string) ?? null, name: p.name as string, quantity: n(p.quantity), revenue: n(p.revenue),
    margin: p.margin == null ? null : n(p.margin), hasRecipe: Boolean(p.has_recipe),
  }));
  const prevProductRows = ((prevProducts.data as Record<string, unknown>[] | null) ?? []);
  const orderRevenue = {
    current: productRows.reduce((s, p) => s + p.revenue, 0),
    previous: prevProductRows.reduce((s, p) => s + n(p.revenue), 0),
  };

  // Inventory alerts
  const soon = d(3);
  const inventoryAlerts = ((inventory.data as Record<string, unknown>[] | null) ?? [])
    .map((i) => {
      const q = n(i.quantity), min = n(i.min_quantity);
      const kind: "out" | "low" | "expiring" | null = q <= 0 ? "out" : min > 0 && q <= min ? "low" : i.expires_on && (i.expires_on as string) <= soon ? "expiring" : null;
      return kind ? { id: i.id as string, name: i.name as string, quantity: q, min_quantity: min, unit: i.unit as string, expires_on: (i.expires_on as string) ?? null, kind } : null;
    })
    .filter(Boolean)
    .sort((a, b) => ["out", "low", "expiring"].indexOf(a!.kind) - ["out", "low", "expiring"].indexOf(b!.kind)) as DashboardData["inventoryAlerts"];

  // Alerts
  const alerts: Alert[] = [];
  const money = (v: number) => new Intl.NumberFormat(ws.restaurant.locale, { style: "currency", currency: ws.restaurant.currency, maximumFractionDigits: 0 }).format(v);
  const outCount = inventoryAlerts.filter((i) => i.kind === "out").length;
  const lowCount = inventoryAlerts.filter((i) => i.kind === "low").length;
  const expCount = inventoryAlerts.filter((i) => i.kind === "expiring").length;
  if (outCount) alerts.push({ id: "out", severity: "critical", title: `${outCount} item${outCount > 1 ? "s" : ""} out of stock`, detail: inventoryAlerts.filter((i) => i.kind === "out").slice(0, 3).map((i) => i.name).join(", "), href: "/inventory?filter=low" });
  if (lowCount) alerts.push({ id: "low", severity: "warning", title: `${lowCount} item${lowCount > 1 ? "s" : ""} running low`, detail: inventoryAlerts.filter((i) => i.kind === "low").slice(0, 3).map((i) => i.name).join(", "), href: "/inventory?filter=low" });
  if (expCount) alerts.push({ id: "exp", severity: "warning", title: `${expCount} item${expCount > 1 ? "s" : ""} expiring within 3 days`, detail: inventoryAlerts.filter((i) => i.kind === "expiring").slice(0, 3).map((i) => i.name).join(", "), href: "/inventory?filter=expiring" });

  const lowMargin = productRows.filter((p) => p.margin != null && p.margin < 0.6 && p.quantity >= 3);
  if (lowMargin.length) alerts.push({ id: "margin", severity: "warning", title: `${lowMargin.length} product${lowMargin.length > 1 ? "s" : ""} with low margin`, detail: `${lowMargin.slice(0, 3).map((p) => `${p.name} (${Math.round(p.margin! * 100)}%)`).join(", ")} — food cost above 40%`, href: "/menu" });

  const noRecipe = ((menuNoRecipe.data as { id: string; name: string; recipes: { recipe_ingredients: { count: number }[] }[] | { recipe_ingredients: { count: number }[] } | null }[] | null) ?? [])
    .filter((m) => {
      const r = Array.isArray(m.recipes) ? m.recipes[0] : m.recipes;
      return !r || !(r.recipe_ingredients?.[0]?.count);
    });
  if (noRecipe.length) alerts.push({ id: "recipe", severity: "info", title: `${noRecipe.length} menu item${noRecipe.length > 1 ? "s" : ""} without a recipe`, detail: `Margins and stock deductions can't be calculated for ${noRecipe.slice(0, 3).map((m) => m.name).join(", ")}`, href: "/menu" });

  for (const r of (recurringDue.data as { id: string; description: string; amount: number; next_due_on: string }[] | null) ?? []) {
    alerts.push({ id: `bill-${r.id}`, severity: r.next_due_on < today ? "warning" : "info", title: `${r.description} due ${r.next_due_on === today ? "today" : r.next_due_on < today ? "— overdue" : `on ${format(parseISO(r.next_due_on), "MMM d")}`}`, detail: money(n(r.amount)), href: "/finances?tab=recurring" });
  }

  const recentExpenses = (bigExpenses.data as { id: string; description: string; amount: number; category: string; date: string }[] | null) ?? [];
  const byCat = new Map<string, number[]>();
  for (const e of recentExpenses) byCat.set(e.category, [...(byCat.get(e.category) ?? []), n(e.amount)]);
  for (const e of recentExpenses.filter((x) => x.date >= range.from && x.date <= range.to)) {
    const arr = byCat.get(e.category) ?? [];
    if (arr.length < 3) continue;
    const others = arr.filter((v) => v !== n(e.amount));
    const avg = others.reduce((s, v) => s + v, 0) / Math.max(others.length, 1);
    if (avg > 0 && n(e.amount) > avg * 2.5 && n(e.amount) > 200) {
      alerts.push({ id: `unusual-${e.id}`, severity: "warning", title: `Unusual expense: ${e.description}`, detail: `${money(n(e.amount))} — about ${Math.round(n(e.amount) / avg)}× your usual ${EXPENSE_LABELS[e.category as ExpenseCategory]?.toLowerCase() ?? e.category} spend`, href: "/finances" });
    }
  }
  if (can("finances") && totals.revenue > 0 && recentExpenses.filter((e) => e.date >= d(-30)).length === 0) {
    alerts.push({ id: "nofin", severity: "info", title: "No expenses recorded in the last 30 days", detail: "Profit can't be estimated accurately until costs are added.", href: "/finances" });
  }

  // Insights — computed from data, never invented.
  const insights: DashboardData["insights"] = [];
  const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : null);
  const revChange = pct(totals.revenue, previous.revenue);
  if (revChange != null && totals.revenue > 0) insights.push({ id: "rev", tone: revChange >= 0 ? "good" : "bad", text: `Revenue is ${revChange >= 0 ? "up" : "down"} ${Math.abs(revChange)}% compared with the previous period (${money(totals.revenue)} vs ${money(previous.revenue)}).` });
  const top = productRows[0];
  if (top && orderRevenue.current > 0) insights.push({ id: "top", tone: "neutral", text: `${top.name} is your best seller: ${top.quantity} sold, ${Math.round((top.revenue / orderRevenue.current) * 100)}% of order revenue.` });
  const ingredients = ((breakdown.data as { category: string; amount: unknown }[] | null) ?? []).find((b) => b.category === "ingredients");
  if (ingredients && totals.revenue > 0) {
    const fc = n(ingredients.amount) / totals.revenue;
    insights.push({ id: "fc", tone: fc > 0.35 ? "bad" : "good", text: `Ingredient spend is ${Math.round(fc * 100)}% of revenue${fc > 0.35 ? " — above the 28–35% most restaurants aim for." : ", within a healthy range."}` });
  }
  const dailyRows = ((daily.data as { day: string; revenue: unknown }[] | null) ?? []).filter((r) => r.day >= range.from);
  if (dailyRows.length >= 7) {
    const byDow = new Map<number, number[]>();
    for (const r of dailyRows) { const k = parseISO(r.day).getDay(); byDow.set(k, [...(byDow.get(k) ?? []), n(r.revenue)]); }
    const avgs = [...byDow.entries()].map(([k, v]) => ({ k, avg: v.reduce((s, x) => s + x, 0) / v.length }));
    const best = avgs.sort((a, b) => b.avg - a.avg)[0];
    if (best && best.avg > 0) insights.push({ id: "dow", tone: "neutral", text: `${format(addDays(parseISO("2024-01-07"), best.k), "EEEE")}s are your strongest day, averaging ${money(best.avg)}.` });
  }
  if (totals.revenue > 0 || totals.expenses > 0) {
    const margin = totals.revenue ? (totals.revenue - totals.expenses) / totals.revenue : null;
    if (margin != null) insights.push({ id: "pm", tone: margin >= 0.1 ? "good" : "bad", text: `Estimated profit margin for the period is ${Math.round(margin * 100)}%.` });
  }

  const rev = ((revenueRows.data as Record<string, unknown>[] | null) ?? []).map((r) => ({ id: `r-${r.id}`, kind: "revenue" as const, description: r.description as string, amount: n(r.amount), date: r.date as string, category: r.source as string, created_at: r.created_at as string }));
  const exp = ((expenseRows.data as Record<string, unknown>[] | null) ?? []).map((e) => ({ id: `e-${e.id}`, kind: "expense" as const, description: e.description as string, amount: n(e.amount), date: e.date as string, category: e.category as string, created_at: e.created_at as string }));
  const transactions = [...rev, ...exp].sort((a, b) => (b.date + b.created_at).localeCompare(a.date + a.created_at)).slice(0, 8).map(({ created_at: _c, ...t }) => { void _c; return t; });

  const dailySeries: SeriesPoint[] = ((daily.data as { day: string; revenue: unknown; expenses: unknown; orders: unknown }[] | null) ?? []).map((r) => ({
    label: format(parseISO(r.day), "MMM d"), date: r.day, revenue: n(r.revenue), expenses: n(r.expenses), orders: n(r.orders),
  }));

  return {
    range,
    totals,
    previous,
    orderRevenue,
    quick: {
      today: n((tdy.data as Record<string, unknown>)?.revenue), todayPrev: n((tdyPrev.data as Record<string, unknown>)?.revenue),
      week: n((wk.data as Record<string, unknown>)?.revenue), weekPrev: n((wkPrev.data as Record<string, unknown>)?.revenue),
      month: n((mo.data as Record<string, unknown>)?.revenue), monthPrev: n((moPrev.data as Record<string, unknown>)?.revenue),
    },
    daily: dailySeries,
    revenueSeries: { hour: toSeries(sHour.data, "hour"), day: dayFilled, week: toSeries(sWeek.data, "week"), month: toSeries(sMonth.data, "month") },
    expenseBreakdown: ((breakdown.data as { category: ExpenseCategory; amount: unknown }[] | null) ?? []).map((b) => ({ category: b.category, label: EXPENSE_LABELS[b.category] ?? b.category, amount: n(b.amount) })),
    products: productRows.slice(0, 6).map(({ hasRecipe: _h, ...p }) => { void _h; return p; }),
    liveOrders: ((live.data as Record<string, unknown>[] | null) ?? []).map((o) => ({
      id: o.id as string, number: n(o.number), status: o.status as OrderStatus, source: o.source as OrderSource, is_simulated: Boolean(o.is_simulated),
      created_at: o.created_at as string, total: n(o.total), customer_name: (o.customer_name as string) ?? null, table_label: (o.table_label as string) ?? null,
      items: n((o.order_items as { count: number }[] | undefined)?.[0]?.count),
    })),
    inventoryAlerts,
    activity: ((activity.data as { id: number; summary: string; action: string; created_at: string }[] | null) ?? []),
    transactions,
    shifts: ((shifts.data as Record<string, unknown>[] | null) ?? []).map((s) => {
      const e = s.employees as { full_name: string; position: string | null } | null;
      return { id: s.id as string, employee: e?.full_name ?? "—", position: (s.position as string) ?? e?.position ?? null, starts_at: s.starts_at as string, ends_at: s.ends_at as string };
    }),
    alerts: alerts.sort((a, b) => ["critical", "warning", "info"].indexOf(a.severity) - ["critical", "warning", "info"].indexOf(b.severity)),
    insights,
    hasAnyData: totals.revenue > 0 || totals.expenses > 0 || totals.orders > 0 || previous.revenue > 0 || productRows.length > 0,
  };
}
