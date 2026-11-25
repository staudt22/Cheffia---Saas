"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatMoney } from "@/lib/utils";

type Point = { label: string; revenue: number; expenses?: number; orders?: number };

function useMoney(currency: string, locale: string) {
  return {
    full: (v: number) => formatMoney(v, currency, locale),
    axis: (v: number) => new Intl.NumberFormat(locale, { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(v),
  };
}

function ChartTooltip({ active, payload, label, money }: { active?: boolean; payload?: { name: string; value: number; color: string; dataKey: string; payload: Point }[]; label?: string; money: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  const orders = payload[0]?.payload.orders;
  return (
    <div className="rounded-md bg-surface px-3 py-2 text-xs shadow-pop">
      <p className="mb-1 font-medium text-ink">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-ink-2">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="flex-1">{p.name}</span>
          <span className="font-medium text-ink tabular">{money(p.value)}</span>
        </p>
      ))}
      {orders != null && payload.length === 1 && <p className="mt-0.5 text-ink-3">{orders} orders</p>}
    </div>
  );
}

const axisProps = { tickLine: false, axisLine: false, tickMargin: 8, minTickGap: 18, tick: { fill: "var(--ink-3)", fontSize: 11 } } as const;

export function RevenueChart({ data, kind, currency, locale, height = 240 }: { data: Point[]; kind: "area" | "bar" | "line"; currency: string; locale: string; height?: number }) {
  const m = useMoney(currency, locale);
  const common = { data, margin: { top: 8, right: 4, left: 0, bottom: 0 } };
  const grid = <CartesianGrid vertical={false} strokeDasharray="0" />;
  const x = <XAxis dataKey="label" {...axisProps} />;
  const y = <YAxis {...axisProps} width={64} tickFormatter={m.axis} />;
  const tip = <Tooltip cursor={{ stroke: "var(--line-strong)", fill: "var(--surface-3)" }} content={<ChartTooltip money={m.full} />} />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      {kind === "bar" ? (
        <BarChart {...common} barCategoryGap="22%">
          {grid}{x}{y}{tip}
          <Bar dataKey="revenue" name="Revenue" fill="var(--brand)" animationDuration={500} radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      ) : kind === "line" ? (
        <LineChart {...common}>
          {grid}{x}{y}{tip}
          <Line dataKey="revenue" name="Revenue" stroke="var(--brand)" animationDuration={500} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }} />
        </LineChart>
      ) : (
        <AreaChart {...common}>
          <defs>
            <linearGradient id="rev-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid}{x}{y}{tip}
          <Area dataKey="revenue" animationDuration={500} name="Revenue" stroke="var(--brand)" strokeWidth={2} fill="url(#rev-fill)" activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }} />
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}

/** Revenue and expenses: two series, validated categorical slots 1 & 2, with legend. */
export function RevenueExpenseChart({ data, kind, currency, locale, height = 260 }: { data: Point[]; kind: "line" | "bar"; currency: string; locale: string; height?: number }) {
  const m = useMoney(currency, locale);
  const common = { data, margin: { top: 8, right: 4, left: 0, bottom: 0 } };
  const legend = <Legend verticalAlign="top" align="right" height={28} iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-ink-2">{v}</span>} />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      {kind === "bar" ? (
        <BarChart {...common} barGap={2} barCategoryGap="20%">
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis {...axisProps} width={64} tickFormatter={m.axis} />
          <Tooltip cursor={{ fill: "var(--surface-3)" }} content={<ChartTooltip money={m.full} />} />
          {legend}
          <Bar dataKey="revenue" name="Revenue" fill="var(--series-1)" animationDuration={500} radius={[4, 4, 0, 0]} maxBarSize={18} />
          <Bar dataKey="expenses" animationDuration={500} name="Expenses" fill="var(--series-2)" radius={[4, 4, 0, 0]} maxBarSize={18} />
        </BarChart>
      ) : (
        <LineChart {...common}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis {...axisProps} width={64} tickFormatter={m.axis} />
          <Tooltip cursor={{ stroke: "var(--line-strong)" }} content={<ChartTooltip money={m.full} />} />
          {legend}
          <Line dataKey="revenue" name="Revenue" stroke="var(--series-1)" animationDuration={500} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }} />
          <Line dataKey="expenses" animationDuration={500} name="Expenses" stroke="var(--series-2)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }} />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}

/** Horizontal magnitude bars — one hue, direct value labels, no legend needed. */
export function CategoryBars({ data, currency, locale }: { data: { label: string; amount: number }[]; currency: string; locale: string }) {
  const m = useMoney(currency, locale);
  const max = Math.max(...data.map((d) => d.amount), 1);
  const total = data.reduce((s, d) => s + d.amount, 0);
  return (
    <ul className="flex flex-col gap-2.5">
      {data.map((d) => (
        <li key={d.label} className="group" title={`${d.label}: ${m.full(d.amount)}`}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
            <span className="text-ink-2">{d.label}</span>
            <span className="text-ink tabular"><span className="font-medium">{m.full(d.amount)}</span> <span className="text-ink-3">{Math.round((d.amount / total) * 100)}%</span></span>
          </div>
          <div className="h-2 rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-brand transition-[width] duration-500 group-hover:brightness-110" style={{ width: `${Math.max((d.amount / max) * 100, 1.5)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SimpleBars({ data, color = "var(--brand)", height = 200, format }: { data: { label: string; value: number }[]; color?: string; height?: number; format: (v: number) => string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="22%">
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} width={56} tickFormatter={(v) => format(v)} />
        <Tooltip cursor={{ fill: "var(--surface-3)" }} content={({ active, payload, label }) => active && payload?.length ? (
          <div className="rounded-md bg-surface px-3 py-2 text-xs shadow-pop"><p className="font-medium">{label}</p><p className="text-ink-2 tabular">{format(Number(payload[0]!.value))}</p></div>
        ) : null} />
        <Bar dataKey="value" animationDuration={500} radius={[4, 4, 0, 0]} maxBarSize={32}>
          {data.map((_, i) => <Cell key={i} fill={color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
