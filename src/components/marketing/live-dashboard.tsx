"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { IconKitchen, IconMoney, IconOrders, IconStock } from "./icons";

/**
 * A code-built, self-running mini CheffeData used as the homepage hero. Everything is
 * fictitious and simulated in the browser: orders arrive, move through the kitchen,
 * get completed, add to revenue and deduct stock.
 */

type Stage = "novo" | "preparo" | "pronto" | "concluido";
interface Order { id: number; channel: string; label: string; items: string; total: number; stage: Stage; born: number }

const CHANNELS = [
  { channel: "Salão", label: "Mesa 4" }, { channel: "Delivery", label: "App de delivery" }, { channel: "Balcão", label: "Retirada" },
  { channel: "Salão", label: "Mesa 9" }, { channel: "Delivery", label: "WhatsApp" }, { channel: "Salão", label: "Comanda 31" },
];
const DISHES = [
  { items: "2× Smash burger, 1× Fritas", total: 89.7, uses: { Carne: 2, Pão: 2, Batata: 1 } },
  { items: "1× Pizza margherita", total: 64, uses: { Queijo: 2, Tomate: 2 } },
  { items: "3× Chopp, 1× Porção de fritas", total: 72.5, uses: { Batata: 2 } },
  { items: "1× Parmegiana, 1× Suco", total: 58.9, uses: { Carne: 1, Queijo: 1, Tomate: 1 } },
  { items: "2× Cheeseburger", total: 67.8, uses: { Carne: 2, Pão: 2, Queijo: 2 } },
];

const START_STOCK = { Carne: 78, Pão: 64, Queijo: 52, Batata: 41, Tomate: 29 };

function makeOrder(n: number, stage: Stage = "novo"): Order {
  const c = CHANNELS[n % CHANNELS.length]!, d = DISHES[(n * 3) % DISHES.length]!;
  return { id: 3400 + n, channel: c.channel, label: c.label, items: d.items, total: d.total, stage, born: n };
}

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

interface Sim { tick: number; orders: Order[]; revenue: number; count: number; stock: Record<string, number>; flash: number | null; series: number[] }

/** Stage by age (in beats): 2 beats new, 2 in prep, 1 ready, then done. */
const stageFor = (age: number): Stage => (age < 2 ? "novo" : age < 4 ? "preparo" : age < 5 ? "pronto" : "concluido");

const INITIAL: Sim = {
  tick: 0, orders: [0, -1, -2, -3, -4].map((b) => ({ ...makeOrder(b + 5), born: b, stage: stageFor(-b) })), revenue: 4870, count: 62,
  stock: START_STOCK, flash: null, series: [22, 30, 26, 38, 34, 46, 41, 52, 49, 58, 55, 63],
};

/** One beat of the simulation. Pure: same input, same output. */
function step(s: Sim): Sim {
  const tick = s.tick + 1;
  let { revenue, count, stock, series } = s;
  let flash = s.flash;
  let orders = s.orders.map((o) => {
    const stage = stageFor(tick - o.born);
    if (stage === "concluido" && o.stage !== "concluido") {
      const dish = DISHES.find((d) => d.items === o.items)!;
      revenue += o.total;
      count += 1;
      series = [...series.slice(1), Math.max(18, Math.min(80, series[series.length - 1]! + (tick % 3) * 5 - 4))];
      const copy = { ...stock };
      for (const [k, v] of Object.entries(dish.uses)) copy[k] = Math.max(6, (copy[k] ?? 0) - v * 1.5);
      for (const k of Object.keys(copy)) if (copy[k]! <= 8) copy[k] = START_STOCK[k as keyof typeof START_STOCK];
      stock = copy;
    }
    return { ...o, stage };
  });
  if (tick % 4 !== 3) {
    const n = 5 + tick;
    orders = [{ ...makeOrder(n), born: tick }, ...orders];
    flash = 3400 + n;
  }
  return { tick, orders: orders.slice(0, 9), revenue, count, stock, flash, series };
}

export function LiveDashboard({ className }: { className?: string }) {
  const [sim, setSim] = useState<Sim>(INITIAL);
  const { orders, revenue, count, stock, flash, series } = sim;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setSim(step), 1900);
    return () => window.clearInterval(id);
  }, []);

  const feed = orders.slice(0, 4);
  const col = (s: Stage) => orders.filter((o) => o.stage === s);
  const max = Math.max(...series);

  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-surface/95 text-left shadow-pop ring-1 ring-white/10 backdrop-blur", className)} aria-label="Demonstração animada do painel do CheffeData com dados fictícios" role="img">
      <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" /><span className="size-2.5 rounded-full bg-[#febc2e]" /><span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 flex items-center gap-1.5 text-[11px] text-ink-3"><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-brand" /></span> Ao vivo · Burger da Vila (exemplo)</span>
      </div>

      <div className="grid grid-cols-1 gap-3 p-3 sm:p-4 lg:grid-cols-[1.05fr_1.5fr_0.95fr]">
        {/* KPIs + chart */}
        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-surface-2 p-3.5 ring-1 ring-line">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-ink-3"><IconMoney className="size-4 text-brand" /> Faturamento hoje</p>
            <p className="mt-1 text-2xl font-semibold tabular tracking-tight">{brl(revenue)}</p>
            <div className="mt-3 flex h-14 items-end gap-[3px]" aria-hidden>
              {series.map((v, i) => <span key={i} className="flex-1 rounded-t-[3px] bg-brand transition-all duration-700" style={{ height: `${(v / max) * 100}%`, opacity: 0.35 + (i / series.length) * 0.65 }} />)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface-2 p-3 ring-1 ring-line"><p className="text-[11px] text-ink-3">Pedidos</p><p className="mt-0.5 text-lg font-semibold tabular">{count}</p></div>
            <div className="rounded-xl bg-surface-2 p-3 ring-1 ring-line"><p className="text-[11px] text-ink-3">Ticket médio</p><p className="mt-0.5 text-lg font-semibold tabular">{brl(revenue / count)}</p></div>
          </div>
          <div className="hidden flex-col gap-1.5 rounded-xl bg-surface-2 p-3 ring-1 ring-line sm:flex lg:hidden xl:flex">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-ink-3"><IconOrders className="size-4 text-brand" /> Chegando agora</p>
            {feed.slice(0, 3).map((o) => (
              <div key={o.id} className={cn("flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors duration-700", flash === o.id ? "bg-brand-soft" : "bg-transparent")}>
                <span className="truncate"><span className="font-semibold">#{o.id}</span> <span className="text-ink-3">{o.label}</span></span>
                <span className="shrink-0 font-medium tabular">{brl(o.total)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Kitchen */}
        <div className="rounded-xl bg-surface-2 p-3 ring-1 ring-line">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-ink-3"><IconKitchen className="size-4 text-brand" /> Cozinha</p>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {([["novo", "Novos", "bg-info"], ["preparo", "Em preparo", "bg-warn"], ["pronto", "Prontos", "bg-good"]] as const).map(([s, label, dot]) => (
              <div key={s} className="min-w-0">
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] text-ink-2"><span className={cn("size-1.5 rounded-full", dot)} />{label} <span className="text-ink-3">{col(s).length}</span></p>
                <div className="flex min-h-[168px] flex-col gap-1.5">
                  {col(s).slice(0, 3).map((o) => (
                    <div key={o.id} className={cn("animate-[pop_.45s_ease-out] rounded-lg bg-surface p-2 ring-1 ring-line", s === "pronto" && "ring-good/50")}>
                      <p className="flex items-center justify-between text-[11px] font-semibold"><span>#{o.id}</span><span className="font-normal text-ink-3">{o.channel}</span></p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-2">{o.items}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stock */}
        <div className="hidden rounded-xl bg-surface-2 p-3 ring-1 ring-line lg:block">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-ink-3"><IconStock className="size-4 text-brand" /> Estoque (baixa sozinho)</p>
          <ul className="mt-3 flex flex-col gap-3">
            {Object.entries(stock).map(([k, v]) => {
              const low = v < 22;
              return (
                <li key={k}>
                  <div className="flex justify-between text-[11px]"><span className="text-ink-2">{k}</span><span className={cn("tabular", low ? "font-semibold text-warn" : "text-ink-3")}>{low ? "Acabando" : `${Math.round(v)}%`}</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3"><div className={cn("h-full rounded-full transition-all duration-700", low ? "bg-warn" : "bg-brand")} style={{ width: `${v}%` }} /></div>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 rounded-lg bg-surface px-2.5 py-2 text-[11px] leading-snug text-ink-3 ring-1 ring-line">Cada pedido concluído desconta os ingredientes da ficha técnica.</p>
        </div>
      </div>
    </div>
  );
}
