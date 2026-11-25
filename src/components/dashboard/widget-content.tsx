"use client";

import { RelativeTime } from "@/components/ui/relative-time";
import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarClock, ChefHat, CircleAlert, Info, Lightbulb, Minus, PackageX, Receipt, Sparkles, TrendingDown, TrendingUp,
} from "lucide-react";
import { CardHeader as BaseHeader } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { WIDGET_HELP } from "@/lib/dashboard/widgets";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/segmented";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/dashboard/sparkline";
import { CategoryBars, RevenueChart, RevenueExpenseChart } from "@/components/dashboard/charts";
import { SourceBadge } from "@/components/orders/source-badge";
import { STATUS_META } from "@/lib/orders";
import { formatTime } from "@/lib/dates";
import { cn, formatMoney, formatNumber, formatPercent, formatQuantity, pctChange } from "@/lib/utils";
import type { DashboardData } from "@/lib/dashboard/data";
import type { WidgetInstance } from "@/lib/types";

export interface Ctx { data: DashboardData; currency: string; locale: string; timezone: string; compact: boolean }

function WHeader({ type, ...p }: React.ComponentProps<typeof BaseHeader> & { type: string }) {
  return <BaseHeader help={WIDGET_HELP[type]} {...p} />;
}

export const HIGHLIGHT_WIDGETS = new Set(["kpi_revenue", "kpi_profit"]);

function Delta({ current, previous, invert = false, label, onColor = false }: { current: number; previous: number; invert?: boolean; label: string; onColor?: boolean }) {
  const change = pctChange(current, previous);
  if (change == null) return <span className={cn("text-xs", onColor ? "opacity-75" : "text-ink-3")}>No data for {label}</span>;
  const up = change > 0.0005, down = change < -0.0005;
  const good = invert ? down : up;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  return (
    <span className="flex items-center gap-1 text-xs">
      <span className={cn("inline-flex items-center gap-0.5 font-medium tabular", onColor ? "rounded bg-black/15 px-1" : up || down ? (good ? "text-good" : "text-bad") : "text-ink-3")}>
        <Icon className="size-3.5" aria-hidden />{formatPercent(Math.abs(change), "en-US", 1)}
      </span>
      <span className={onColor ? "opacity-75" : "text-ink-3"}>vs {label}</span>
    </span>
  );
}

function Kpi({ title, value, current, previous, spark, invert, prevLabel, ctx, help, highlight }: {
  title: string; value: string; current: number; previous: number; spark?: number[]; invert?: boolean; prevLabel: string; ctx: Ctx; help?: string; highlight?: boolean;
}) {
  return (
    <div className={cn("flex h-full flex-col justify-between", ctx.compact ? "p-3" : "p-4")}>
      <p className={cn("flex items-center gap-1.5 text-[13px] font-medium", highlight ? "opacity-80" : "text-ink-3")}>{title}{help && <InfoTip text={help} className={highlight ? "text-current opacity-70 hover:text-current" : undefined} />}</p>
      <div className={cn("flex items-end justify-between gap-3", ctx.compact ? "mt-1.5" : "mt-3")}>
        <div className="min-w-0">
          <p className={cn("font-semibold tracking-tight tabular", highlight ? "" : "text-ink", ctx.compact ? "text-xl" : "text-[28px] leading-8")}>{value}</p>
          <div className="mt-1"><Delta current={current} previous={previous} invert={invert} label={prevLabel} onColor={highlight} /></div>
        </div>
        {spark && <Sparkline values={spark} color={highlight ? "currentColor" : undefined} className="hidden h-9 w-20 shrink sm:block" />}
      </div>
    </div>
  );
}

function ListEmpty({ icon, title, text, href, cta }: { icon: React.ReactNode; title: string; text: string; href?: string; cta?: string }) {
  return <EmptyState className="py-8" icon={icon} title={title} description={text} action={href && cta ? <Link href={href} className="text-sm font-medium text-brand hover:underline">{cta}</Link> : undefined} />;
}

export function WidgetContent({ widget, ctx, onConfig }: { widget: WidgetInstance; ctx: Ctx; onConfig?: (c: WidgetInstance["config"]) => void }) {
  const { data, currency, locale } = ctx;
  const money = (v: number, compact = false) => formatMoney(v, currency, locale, compact);
  // KPI tiles: drop cents on large values so the number never truncates.
  const kpiMoney = (v: number) => (Math.abs(v) >= 1000 ? new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(v) : money(v));
  const spark = (key: "revenue" | "expenses" | "orders") => data.daily.map((d) => Number(d[key] ?? 0));

  switch (widget.type) {
    case "kpi_revenue":
      return <Kpi ctx={ctx} help={WIDGET_HELP[widget.type]} highlight={HIGHLIGHT_WIDGETS.has(widget.type)} title="Revenue" value={kpiMoney(data.totals.revenue)} current={data.totals.revenue} previous={data.previous.revenue} spark={spark("revenue")} prevLabel="previous period" />;
    case "kpi_expenses":
      return <Kpi ctx={ctx} help={WIDGET_HELP[widget.type]} highlight={HIGHLIGHT_WIDGETS.has(widget.type)} title="Expenses" value={kpiMoney(data.totals.expenses)} current={data.totals.expenses} previous={data.previous.expenses} spark={spark("expenses")} invert prevLabel="previous period" />;
    case "kpi_profit": {
      const p = data.totals.revenue - data.totals.expenses, pp = data.previous.revenue - data.previous.expenses;
      const profitSpark = data.daily.map((d) => d.revenue - (d.expenses ?? 0));
      return <Kpi ctx={ctx} help={WIDGET_HELP[widget.type]} highlight={HIGHLIGHT_WIDGETS.has(widget.type)} title="Estimated profit" value={kpiMoney(p)} current={p} previous={pp} spark={profitSpark} prevLabel="previous period" />;
    }
    case "kpi_orders":
      return <Kpi ctx={ctx} help={WIDGET_HELP[widget.type]} highlight={HIGHLIGHT_WIDGETS.has(widget.type)} title="Orders" value={formatNumber(data.totals.orders, locale)} current={data.totals.orders} previous={data.previous.orders} spark={spark("orders")} prevLabel="previous period" />;
    case "kpi_aov": {
      const a = data.totals.orders ? data.orderRevenue.current / data.totals.orders : 0;
      const b = data.previous.orders ? data.orderRevenue.previous / data.previous.orders : 0;
      return <Kpi ctx={ctx} help={WIDGET_HELP[widget.type]} highlight={HIGHLIGHT_WIDGETS.has(widget.type)} title="Average order value" value={money(a)} current={a} previous={b} prevLabel="previous period" />;
    }
    case "kpi_today_revenue":
      return <Kpi ctx={ctx} help={WIDGET_HELP[widget.type]} highlight={HIGHLIGHT_WIDGETS.has(widget.type)} title="Today's revenue" value={kpiMoney(data.quick.today)} current={data.quick.today} previous={data.quick.todayPrev} prevLabel="same day last week" />;
    case "kpi_week_revenue":
      return <Kpi ctx={ctx} help={WIDGET_HELP[widget.type]} highlight={HIGHLIGHT_WIDGETS.has(widget.type)} title="Weekly revenue" value={kpiMoney(data.quick.week)} current={data.quick.week} previous={data.quick.weekPrev} prevLabel="previous 7 days" />;
    case "kpi_month_revenue":
      return <Kpi ctx={ctx} help={WIDGET_HELP[widget.type]} highlight={HIGHLIGHT_WIDGETS.has(widget.type)} title="Monthly revenue" value={kpiMoney(data.quick.month)} current={data.quick.month} previous={data.quick.monthPrev} prevLabel="same point last month" />;

    case "revenue_chart":
      return <RevenueWidget widget={widget} ctx={ctx} onConfig={onConfig} />;

    case "expense_chart": {
      const kind = widget.config?.chart === "bar" ? "bar" : "line";
      return (
        <>
          <WHeader type={widget.type} title="Revenue vs expenses" description={data.range.label} action={onConfig && (
            <Segmented ariaLabel="Chart type" value={kind} onChange={(v) => onConfig({ ...widget.config, chart: v })} options={[{ value: "line", label: "Line" }, { value: "bar", label: "Bars" }]} />
          )} />
          <div className="px-2 pb-3 pt-2">
            {data.daily.some((d) => d.revenue || d.expenses) ? (
              <RevenueExpenseChart data={data.daily} kind={kind} currency={currency} locale={locale} height={ctx.compact ? 220 : 260} />
            ) : <ListEmpty icon={<Receipt />} title="Nothing recorded yet" text="Revenue and expenses for this period will appear here." href="/finances" cta="Add an expense" />}
          </div>
        </>
      );
    }

    case "expense_breakdown":
      return (
        <>
          <WHeader type={widget.type} title="Expense breakdown" description={`${data.range.label} · ${money(data.totals.expenses)}`} />
          <div className="p-4">
            {data.expenseBreakdown.length ? <CategoryBars data={data.expenseBreakdown.slice(0, ctx.compact ? 5 : 7)} currency={currency} locale={locale} />
              : <ListEmpty icon={<Receipt />} title="No expenses in this period" text="Record rent, ingredients and bills to see where the money goes." href="/finances" cta="Add an expense" />}
          </div>
        </>
      );

    case "popular_products":
      return (
        <>
          <WHeader type={widget.type} title="Popular products" description={data.range.label} action={<Link href="/menu" className="text-xs font-medium text-ink-3 hover:text-ink">Menu</Link>} />
          <div className="px-4 pb-3 pt-2">
            {data.products.length ? (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-ink-3"><th className="pb-2 font-medium">Product</th><th className="pb-2 text-right font-medium">Sold</th><th className="pb-2 text-right font-medium">Revenue</th><th className="pb-2 text-right font-medium">Margin</th></tr></thead>
                <tbody>
                  {data.products.slice(0, ctx.compact ? 4 : 6).map((p, i) => (
                    <tr key={p.id ?? p.name} className="border-t border-line">
                      <td className="py-2 pr-2"><span className="mr-2 inline-block w-4 text-xs text-ink-3 tabular">{i + 1}</span>{p.name}</td>
                      <td className="py-2 text-right tabular text-ink-2">{formatNumber(p.quantity, locale)}</td>
                      <td className="py-2 text-right font-medium tabular">{money(p.revenue)}</td>
                      <td className="py-2 text-right tabular">
                        {p.margin == null ? <span className="text-xs text-ink-3" title="Add a recipe to estimate margin">—</span>
                          : <span className={cn(p.margin < 0.6 ? "text-warn" : "text-ink-2")}>{formatPercent(p.margin, locale, 0)}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <ListEmpty icon={<ChefHat />} title="No sales yet" text="Complete orders to see your best sellers." href="/orders" cta="Go to orders" />}
          </div>
        </>
      );

    case "order_activity":
      return (
        <>
          <WHeader type={widget.type} title="Order activity" description={`${data.liveOrders.length} in progress`} action={<Link href="/orders/kitchen" className="text-xs font-medium text-ink-3 hover:text-ink">Kitchen display</Link>} />
          <div className="px-2 pb-2 pt-2">
            {data.liveOrders.length ? (
              <ul>
                {data.liveOrders.slice(0, ctx.compact ? 5 : 7).map((o) => (
                  <li key={o.id}>
                    <Link href={`/orders?order=${o.id}`} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-surface-2">
                      <span className="w-12 text-sm font-semibold tabular">#{o.number}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm">{o.customer_name ?? o.table_label ?? `${o.items} item${o.items === 1 ? "" : "s"}`}</span><SourceBadge source={o.source} simulated={o.is_simulated} /></span>
                      <Badge tone={STATUS_META[o.status].tone}>{STATUS_META[o.status].label}</Badge>
                      <span className="w-14 text-right text-xs text-ink-3 tabular"><RelativeTime date={o.created_at} /></span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <ListEmpty icon={<ChefHat />} title="All caught up" text="No orders in progress right now." href="/orders?new=1" cta="Create an order" />}
          </div>
        </>
      );

    case "inventory_alerts":
      return (
        <>
          <WHeader type={widget.type} title="Inventory alerts" description={data.inventoryAlerts.length ? `${data.inventoryAlerts.length} item${data.inventoryAlerts.length > 1 ? "s" : ""} need attention` : "Stock levels look good"} action={<Link href="/inventory" className="text-xs font-medium text-ink-3 hover:text-ink">Inventory</Link>} />
          <div className="px-4 pb-3 pt-2">
            {data.inventoryAlerts.length ? (
              <ul className="flex flex-col gap-1">
                {data.inventoryAlerts.slice(0, 6).map((i) => (
                  <li key={i.id} className="flex items-center gap-3 border-t border-line py-2 first:border-0">
                    <span className="min-w-0 flex-1 truncate text-sm">{i.name}</span>
                    <span className="text-xs text-ink-3 tabular">{formatQuantity(i.quantity, i.unit, locale)}{i.kind !== "expiring" && i.min_quantity ? ` / min ${formatNumber(i.min_quantity, locale, 2)}` : ""}</span>
                    {i.kind === "out" ? <Badge tone="bad"><PackageX /> Out</Badge> : i.kind === "low" ? <Badge tone="warn"><AlertTriangle /> Low</Badge> : <Badge tone="info"><CalendarClock /> Expires {i.expires_on}</Badge>}
                  </li>
                ))}
              </ul>
            ) : <ListEmpty icon={<Sparkles />} title="Nothing to restock" text="Items below their minimum or close to expiry show up here." />}
          </div>
        </>
      );

    case "alerts":
      return (
        <>
          <WHeader type={widget.type} title="Alerts" description={data.alerts.length ? `${data.alerts.length} need${data.alerts.length === 1 ? "s" : ""} your attention` : "Nothing urgent"} />
          <div className="px-2 pb-2 pt-2">
            {data.alerts.length ? (
              <ul>
                {data.alerts.slice(0, ctx.compact ? 4 : 6).map((a) => {
                  const Icon = a.severity === "critical" ? CircleAlert : a.severity === "warning" ? AlertTriangle : Info;
                  return (
                    <li key={a.id}>
                      <Link href={a.href} className="flex gap-3 rounded-md px-2 py-2 hover:bg-surface-2">
                        <Icon className={cn("mt-0.5 size-4 shrink-0", a.severity === "critical" ? "text-bad" : a.severity === "warning" ? "text-warn" : "text-info")} aria-label={a.severity} />
                        <span className="min-w-0"><span className="block text-sm font-medium">{a.title}</span><span className="block truncate text-xs text-ink-3">{a.detail}</span></span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : <ListEmpty icon={<Sparkles />} title="All clear" text="Low stock, unusual expenses and upcoming bills will show up here." />}
          </div>
        </>
      );

    case "recent_activity":
      return (
        <>
          <WHeader type={widget.type} title="Recent activity" />
          <div className="px-4 pb-3 pt-2">
            {data.activity.length ? (
              <ol className="relative flex flex-col gap-3 before:absolute before:inset-y-1 before:left-[3px] before:w-px before:bg-line">
                {data.activity.slice(0, ctx.compact ? 5 : 7).map((a) => (
                  <li key={a.id} className="relative flex gap-3 pl-4">
                    <span className={cn("absolute left-0 top-1.5 size-[7px] rounded-full ring-2 ring-surface", a.action.startsWith("order") ? "bg-info" : a.action.startsWith("expense") ? "bg-accent" : a.action.startsWith("stock") ? "bg-warn" : "bg-ink-3")} aria-hidden />
                    <span className="min-w-0 flex-1 text-sm leading-5">{a.summary}</span>
                    <span className="shrink-0 text-xs text-ink-3"><RelativeTime date={a.created_at} /></span>
                  </li>
                ))}
              </ol>
            ) : <ListEmpty icon={<Info />} title="No activity yet" text="New orders, expenses and stock changes will appear here." />}
          </div>
        </>
      );

    case "recent_transactions":
      return (
        <>
          <WHeader type={widget.type} title="Recent transactions" action={<Link href="/finances" className="text-xs font-medium text-ink-3 hover:text-ink">Finances</Link>} />
          <div className="px-4 pb-3 pt-2">
            {data.transactions.length ? (
              <ul>
                {data.transactions.slice(0, ctx.compact ? 5 : 7).map((t) => (
                  <li key={t.id} className="flex items-center gap-3 border-t border-line py-2 first:border-0">
                    <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", t.kind === "revenue" ? "bg-good-soft text-good" : "bg-surface-3 text-ink-2")}>
                      {t.kind === "revenue" ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm">{t.description}</span><span className="block text-xs text-ink-3">{t.date}</span></span>
                    <span className={cn("text-sm font-medium tabular", t.kind === "revenue" ? "text-good" : "text-ink")}>{t.kind === "revenue" ? "+" : "−"}{money(t.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : <ListEmpty icon={<Receipt />} title="No transactions yet" text="Completed orders and recorded expenses show up here." href="/finances" cta="Open finances" />}
          </div>
        </>
      );

    case "upcoming_shifts":
      return (
        <>
          <WHeader type={widget.type} title="Upcoming shifts" />
          <div className="px-4 pb-3 pt-2">
            {data.shifts.length ? (
              <ul>
                {data.shifts.map((s) => {
                  const live = s.live;
                  return (
                    <li key={s.id} className="flex items-center gap-3 border-t border-line py-2 first:border-0">
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm">{s.employee}</span><span className="block text-xs text-ink-3">{s.position ?? "Shift"}</span></span>
                      {live && <Badge tone="good">On shift</Badge>}
                      <span className="text-xs text-ink-2 tabular">
                        {new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: ctx.timezone }).format(new Date(s.starts_at))} {formatTime(s.starts_at, locale, ctx.timezone)}–{formatTime(s.ends_at, locale, ctx.timezone)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : <ListEmpty icon={<CalendarClock />} title="No upcoming shifts" text="Shift scheduling arrives with the Team module." />}
          </div>
        </>
      );

    case "ai_insights":
      return (
        <>
          <WHeader type={widget.type} title={<span className="flex items-center gap-1.5"><Lightbulb className="size-4 text-accent" /> Insights</span>} description="Calculated from your own numbers" />
          <div className="px-4 pb-3 pt-2">
            {data.insights.length ? (
              <ul className="flex flex-col gap-2">
                {data.insights.slice(0, ctx.compact ? 3 : 5).map((i) => (
                  <li key={i.id} className="flex gap-2.5 text-sm leading-5">
                    <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", i.tone === "good" ? "bg-good" : i.tone === "bad" ? "bg-bad" : "bg-ink-3")} aria-hidden />
                    <span>{i.text}</span>
                  </li>
                ))}
              </ul>
            ) : <ListEmpty icon={<Lightbulb />} title="Not enough data yet" text="Insights appear once you have a week or so of orders and expenses." />}
          </div>
        </>
      );

    default:
      return <div className="p-4 text-sm text-ink-3">Unknown widget</div>;
  }
}

function RevenueWidget({ widget, ctx, onConfig }: { widget: WidgetInstance; ctx: Ctx; onConfig?: (c: WidgetInstance["config"]) => void }) {
  const defaultBucket = ctx.data.range.days <= 1 ? "hour" : "day";
  const [bucket, setBucket] = useState<"hour" | "day" | "week" | "month">(widget.config?.bucket ?? defaultBucket);
  const kind = widget.config?.chart ?? "area";
  const series = ctx.data.revenueSeries[bucket];
  const total = series.reduce((s, p) => s + p.revenue, 0);
  const scope = bucket === "week" ? "Last 12 weeks" : bucket === "month" ? "Last 12 months" : bucket === "hour" ? `${ctx.data.range.label} · by hour (orders)` : ctx.data.range.days < 2 ? "Last 30 days" : ctx.data.range.label;
  return (
    <>
      <WHeader type={widget.type}
        title="Revenue"
        description={<span className="tabular">{scope} · {formatMoney(total, ctx.currency, ctx.locale)}</span>}
        action={
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <Segmented ariaLabel="Granularity" value={bucket} onChange={setBucket} options={[{ value: "hour", label: "Hourly" }, { value: "day", label: "Daily" }, { value: "week", label: "Weekly" }, { value: "month", label: "Monthly" }]} />
            {onConfig && <Segmented ariaLabel="Chart type" value={kind} onChange={(v) => onConfig({ ...widget.config, chart: v })} options={[{ value: "area", label: "Area" }, { value: "bar", label: "Bars" }, { value: "line", label: "Line" }]} />}
          </div>
        }
      />
      <div className="px-2 pb-3 pt-3">
        {series.some((p) => p.revenue > 0) ? (
          <RevenueChart data={series} kind={kind} currency={ctx.currency} locale={ctx.locale} height={ctx.compact ? 200 : 250} />
        ) : <ListEmpty icon={<TrendingUp />} title="No revenue in this view" text="Completed orders and recorded revenue will chart here." href="/orders?new=1" cta="Create an order" />}
      </div>
    </>
  );
}
