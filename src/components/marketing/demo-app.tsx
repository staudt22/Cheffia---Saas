"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ChevronRight, Info, Plus, RotateCcw, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { CheffeDataLogo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { RevenueChart, SimpleBars } from "@/components/dashboard/charts";
import { cn } from "@/lib/utils";
import { IconChart, IconKitchen, IconOrders, IconStock } from "./icons";

/* ------------------------------------------------------------------ fake data */
type Status = "novo" | "preparo" | "pronto" | "concluido" | "cancelado";
interface Line { dish: string; qty: number }
interface Order { id: number; where: string; channel: "Salão" | "Delivery" | "Balcão"; lines: Line[]; status: Status; minutes: number; note?: string }
interface StockItem { name: string; unit: string; qty: number; min: number }

const MENU: Record<string, { price: number; uses: Record<string, number> }> = {
  "Smash burger": { price: 32.9, uses: { "Carne bovina": 0.12, "Pão brioche": 1, "Queijo cheddar": 0.03 } },
  "Cheese bacon": { price: 38.9, uses: { "Carne bovina": 0.15, "Pão brioche": 1, "Queijo cheddar": 0.04, Bacon: 0.04 } },
  "Batata frita": { price: 19.9, uses: { Batata: 0.25 } },
  "Milk-shake": { price: 21.9, uses: { "Sorvete de baunilha": 0.2 } },
  Refrigerante: { price: 7.5, uses: { "Refrigerante lata": 1 } },
};
const DISHES = Object.keys(MENU);

const INITIAL_STOCK: StockItem[] = [
  { name: "Carne bovina", unit: "kg", qty: 4.2, min: 2 },
  { name: "Pão brioche", unit: "un", qty: 38, min: 20 },
  { name: "Queijo cheddar", unit: "kg", qty: 0.9, min: 0.6 },
  { name: "Bacon", unit: "kg", qty: 0.5, min: 0.5 },
  { name: "Batata", unit: "kg", qty: 6, min: 3 },
  { name: "Sorvete de baunilha", unit: "kg", qty: 1.4, min: 1 },
  { name: "Refrigerante lata", unit: "un", qty: 30, min: 24 },
];

const INITIAL_ORDERS: Order[] = [
  { id: 1048, where: "Mesa 7", channel: "Salão", lines: [{ dish: "Cheese bacon", qty: 2 }, { dish: "Batata frita", qty: 1 }], status: "novo", minutes: 1, note: "Um sem cebola" },
  { id: 1047, where: "App de delivery", channel: "Delivery", lines: [{ dish: "Smash burger", qty: 1 }, { dish: "Milk-shake", qty: 1 }], status: "preparo", minutes: 6 },
  { id: 1046, where: "Retirada · Ana", channel: "Balcão", lines: [{ dish: "Smash burger", qty: 3 }], status: "preparo", minutes: 11 },
  { id: 1045, where: "Mesa 2", channel: "Salão", lines: [{ dish: "Batata frita", qty: 2 }, { dish: "Refrigerante", qty: 3 }], status: "pronto", minutes: 14 },
  { id: 1044, where: "Mesa 5", channel: "Salão", lines: [{ dish: "Cheese bacon", qty: 1 }, { dish: "Refrigerante", qty: 1 }], status: "concluido", minutes: 28 },
];

const HOURS = [
  { label: "11h", revenue: 186 }, { label: "12h", revenue: 742 }, { label: "13h", revenue: 918 }, { label: "14h", revenue: 401 },
  { label: "15h", revenue: 164 }, { label: "16h", revenue: 122 }, { label: "17h", revenue: 288 }, { label: "18h", revenue: 615 },
  { label: "19h", revenue: 1104 }, { label: "20h", revenue: 860 },
];

const STATUS: Record<Status, { label: string; tone: "info" | "warn" | "good" | "neutral" | "bad"; next?: Status; action?: string }> = {
  novo: { label: "Novo", tone: "info", next: "preparo", action: "Começar preparo" },
  preparo: { label: "Em preparo", tone: "warn", next: "pronto", action: "Marcar como pronto" },
  pronto: { label: "Pronto", tone: "good", next: "concluido", action: "Concluir pedido" },
  concluido: { label: "Concluído", tone: "neutral" },
  cancelado: { label: "Cancelado", tone: "bad" },
};

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const total = (o: Order) => o.lines.reduce((s, l) => s + MENU[l.dish]!.price * l.qty, 0);
const fmtQty = (v: number, unit: string) => `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: unit === "un" ? 0 : 2 }).format(v)} ${unit}`;

/* ------------------------------------------------------------------ app */
type View = "painel" | "pedidos" | "cozinha" | "estoque";

export function DemoApp() {
  const [view, setView] = useState<View>("painel");
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [stock, setStock] = useState(INITIAL_STOCK);
  const [hours, setHours] = useState(HOURS);
  const [nextId, setNextId] = useState(1049);
  const [selected, setSelected] = useState<number | null>(null);

  function advance(id: number) {
    const o = orders.find((x) => x.id === id);
    if (!o) return;
    const to = STATUS[o.status].next;
    if (!to) return;
    setOrders((prev) => prev.map((x) => (x.id === id ? { ...x, status: to } : x)));
    if (to === "concluido") {
      const used: Record<string, number> = {};
      for (const l of o.lines) for (const [k, v] of Object.entries(MENU[l.dish]!.uses)) used[k] = (used[k] ?? 0) + v * l.qty;
      setStock((prev) => prev.map((s) => (used[s.name] ? { ...s, qty: Math.max(0, +(s.qty - used[s.name]!).toFixed(3)) } : s)));
      setHours((prev) => prev.map((h, i) => (i === prev.length - 1 ? { ...h, revenue: +(h.revenue + total(o)).toFixed(2) } : h)));
      toast.success(`Pedido #${id} concluído`, { description: `${brl(total(o))} lançado no caixa e ${Object.keys(used).length} ingredientes baixados do estoque.` });
    } else toast(`Pedido #${id}: ${STATUS[to].label.toLowerCase()}`);
  }

  function cancel(id: number) {
    setOrders((prev) => prev.map((x) => (x.id === id ? { ...x, status: "cancelado" } : x)));
    toast(`Pedido #${id} cancelado`);
  }

  function simulate() {
    const n = nextId;
    const places = [["Mesa " + ((n % 12) + 1), "Salão"], ["App de delivery", "Delivery"], ["Retirada", "Balcão"]] as const;
    const [where, channel] = places[n % 3]!;
    const lines: Line[] = [{ dish: DISHES[n % DISHES.length]!, qty: (n % 2) + 1 }, { dish: DISHES[(n + 2) % DISHES.length]!, qty: 1 }];
    setOrders((prev) => [{ id: n, where, channel, lines, status: "novo", minutes: 0 }, ...prev]);
    setNextId(n + 1);
    toast(`Pedido novo #${n} · ${where}`, { description: "Apareceu na hora na tela da cozinha." });
  }

  function restock(name: string) {
    setStock((prev) => prev.map((s) => (s.name === name ? { ...s, qty: +(s.qty + (s.unit === "un" ? 24 : 5)).toFixed(3) } : s)));
    toast.success(`Compra de ${name} registrada`);
  }

  function reset() {
    setOrders(INITIAL_ORDERS); setStock(INITIAL_STOCK); setHours(HOURS); setNextId(1049); setSelected(null);
    toast("Demonstração reiniciada");
  }

  const done = orders.filter((o) => o.status === "concluido");
  const revenue = hours.reduce((s, h) => s + h.revenue, 0);
  const count = 52 + done.length;
  const low = stock.filter((s) => s.qty <= s.min);
  const active = orders.filter((o) => ["novo", "preparo", "pronto"].includes(o.status));
  const open = orders.find((o) => o.id === selected) ?? null;

  const NAV: { key: View; label: string; icon: typeof IconOrders; count?: number }[] = [
    { key: "painel", label: "Visão geral", icon: IconChart },
    { key: "pedidos", label: "Pedidos", icon: IconOrders, count: active.length },
    { key: "cozinha", label: "Cozinha", icon: IconKitchen, count: orders.filter((o) => o.status === "novo").length },
    { key: "estoque", label: "Estoque", icon: IconStock, count: low.length || undefined },
  ];

  return (
    <div className="app-glow min-h-dvh">
      <div className="sticky top-0 z-30 border-b border-accent/30 bg-accent-soft/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-sm">
          <span className="flex items-center gap-2 font-medium text-ink"><Info className="size-4 text-accent" /> Demonstração com dados fictícios — clique à vontade, nada é salvo.</span>
          <span className="ml-auto flex gap-2">
            <Button size="sm" variant="ghost" onClick={reset}><RotateCcw /> Reiniciar</Button>
            <Button asChild size="sm" variant="primary"><Link href="/signup">Criar minha conta grátis <ArrowRight /></Link></Button>
          </span>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden w-52 shrink-0 md:block">
          <Link href="/" className="mb-6 block px-2"><CheffeDataLogo /></Link>
          <p className="mb-2 px-2 text-xs text-ink-3">Burger da Vila (exemplo)</p>
          <nav className="flex flex-col gap-0.5">
            {NAV.map((n) => (
              <button key={n.key} onClick={() => setView(n.key)} className={cn("flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition", view === n.key ? "bg-brand-soft font-medium text-brand" : "text-ink-2 hover:bg-surface-2 hover:text-ink")}>
                <n.icon className="size-[18px]" /> <span className="flex-1">{n.label}</span>
                {n.count ? <span className={cn("rounded-full px-1.5 text-[11px] tabular", n.key === "estoque" ? "bg-warn-soft text-warn" : "bg-surface-3 text-ink-2")}>{n.count}</span> : null}
              </button>
            ))}
          </nav>
          <div className="mt-6 rounded-xl bg-surface p-3.5 text-xs leading-relaxed text-ink-3 ring-1 ring-line">
            <p className="font-medium text-ink">Experimente:</p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-4"><li>Abra a Cozinha e avance um pedido até “Concluído”.</li><li>Veja o faturamento subir no painel.</li><li>Confira o estoque baixando sozinho.</li></ol>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-4 flex gap-1 overflow-x-auto md:hidden">
            {NAV.map((n) => <button key={n.key} onClick={() => setView(n.key)} className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-sm", view === n.key ? "bg-brand text-brand-foreground" : "bg-surface-2 text-ink-2")}>{n.label}</button>)}
          </div>

          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{NAV.find((n) => n.key === view)!.label}</h1>
              <p className="mt-1 text-sm text-ink-3">{{ painel: "Como está o dia de hoje, em segundos.", pedidos: "Todos os pedidos numa fila só. Clique num pedido para ver os detalhes.", cozinha: "A tela que fica no tablet da cozinha. Toque para avançar.", estoque: "Baixa sozinho a cada pedido concluído, pela ficha técnica." }[view]}</p>
            </div>
            {(view === "pedidos" || view === "cozinha") && <Button variant="primary" onClick={simulate}><Plus /> Simular pedido novo</Button>}
          </div>

          {view === "painel" && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Card className="surface-gradient p-4"><p className="text-[13px] opacity-80">Faturamento hoje</p><p className="mt-1.5 text-2xl font-semibold tabular">{brl(revenue)}</p></Card>
                <Card className="p-4"><p className="text-[13px] text-ink-3">Pedidos</p><p className="mt-1.5 text-2xl font-semibold tabular">{count}</p></Card>
                <Card className="p-4"><p className="text-[13px] text-ink-3">Ticket médio</p><p className="mt-1.5 text-2xl font-semibold tabular">{brl(revenue / count)}</p></Card>
                <button onClick={() => setView("estoque")} className="text-left"><Card className={cn("h-full p-4 transition hover:ring-1 hover:ring-warn/40", low.length && "ring-1 ring-warn/30")}><p className="text-[13px] text-ink-3">Itens acabando</p><p className={cn("mt-1.5 text-2xl font-semibold tabular", low.length && "text-warn")}>{low.length}</p></Card></button>
              </div>
              <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
                <Card>
                  <CardHeader title="Faturamento por hora" description="Hoje · conclua um pedido e veja a última barra subir" />
                  <div className="px-2 pb-3 pt-2"><RevenueChart data={hours} kind="bar" currency="BRL" locale="pt-BR" height={250} /></div>
                </Card>
                <Card>
                  <CardHeader title="Pedidos em andamento" description="Clique para abrir" />
                  <ul className="divide-y divide-line px-1 pb-2">
                    {active.slice(0, 5).map((o) => (
                      <li key={o.id}><button onClick={() => { setView("pedidos"); setSelected(o.id); }} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm hover:bg-surface-2">
                        <span className="font-semibold tabular">#{o.id}</span><span className="flex-1 truncate text-ink-2">{o.where}</span><Badge tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Badge><ChevronRight className="size-4 text-ink-3" />
                      </button></li>
                    ))}
                    {!active.length && <li className="px-3 py-6 text-center text-sm text-ink-3">Nenhum pedido em andamento.</li>}
                  </ul>
                </Card>
              </div>
              <Card>
                <CardHeader title="Mais vendidos hoje" description="Unidades" />
                <div className="px-2 pb-3 pt-2"><SimpleBars height={200} format={(v) => String(Math.round(v))} data={DISHES.map((d, i) => ({ label: d, value: [24, 13, 31, 9, 27][i]! + done.reduce((s, o) => s + o.lines.filter((l) => l.dish === d).reduce((a, l) => a + l.qty, 0), 0) }))} /></div>
              </Card>
            </div>
          )}

          {view === "pedidos" && (
            <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
              <Card>
                <Table>
                  <thead><tr><Th>Pedido</Th><Th>Onde</Th><Th className="hidden sm:table-cell">Canal</Th><Th>Status</Th><Th className="text-right">Total</Th></tr></thead>
                  <tbody>
                    {orders.map((o) => (
                      <Tr key={o.id} className={cn("cursor-pointer", selected === o.id && "bg-brand-soft/40")} onClick={() => setSelected(o.id)}>
                        <Td className="font-semibold tabular">#{o.id}</Td><Td>{o.where}</Td><Td className="hidden text-ink-2 sm:table-cell">{o.channel}</Td>
                        <Td><Badge tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Badge></Td><Td className="text-right tabular">{brl(total(o))}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
              <Card className="h-fit lg:sticky lg:top-20">
                {open ? (
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-lg font-semibold">Pedido #{open.id}</p><p className="text-sm text-ink-3">{open.where} · {open.channel} · há {open.minutes} min</p></div>
                      <Badge tone={STATUS[open.status].tone}>{STATUS[open.status].label}</Badge>
                    </div>
                    <ul className="mt-4 divide-y divide-line rounded-lg bg-surface-2 px-3">
                      {open.lines.map((l) => <li key={l.dish} className="flex justify-between py-2.5 text-sm"><span>{l.qty}× {l.dish}</span><span className="tabular text-ink-2">{brl(MENU[l.dish]!.price * l.qty)}</span></li>)}
                    </ul>
                    {open.note && <p className="mt-3 rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">Obs.: {open.note}</p>}
                    <p className="mt-4 flex justify-between font-semibold"><span>Total</span><span className="tabular">{brl(total(open))}</span></p>
                    <div className="mt-5 flex flex-col gap-2">
                      {STATUS[open.status].next && <Button variant="primary" size="lg" onClick={() => advance(open.id)}>{STATUS[open.status].action} <ArrowRight /></Button>}
                      {["novo", "preparo", "pronto"].includes(open.status) && <Button variant="danger-ghost" onClick={() => cancel(open.id)}><X /> Cancelar pedido</Button>}
                    </div>
                  </div>
                ) : <p className="p-8 text-center text-sm text-ink-3">Clique num pedido da lista para ver os itens e mudar o status.</p>}
              </Card>
            </div>
          )}

          {view === "cozinha" && (
            <div className="grid gap-4 md:grid-cols-3">
              {(["novo", "preparo", "pronto"] as const).map((s) => (
                <div key={s} className="rounded-2xl bg-surface/60 p-3 ring-1 ring-line">
                  <p className="mb-3 flex items-center gap-2 px-1 text-sm font-medium"><Badge tone={STATUS[s].tone}>{STATUS[s].label}</Badge><span className="text-ink-3">{orders.filter((o) => o.status === s).length}</span></p>
                  <div className="flex flex-col gap-2.5">
                    {orders.filter((o) => o.status === s).map((o) => (
                      <div key={o.id} className="animate-[pop_.35s_ease-out] rounded-xl bg-surface p-3.5 shadow-card ring-1 ring-line">
                        <div className="flex justify-between"><span className="font-semibold">#{o.id}</span><span className={cn("text-xs tabular", o.minutes > 10 ? "font-semibold text-bad" : "text-ink-3")}>{o.minutes} min</span></div>
                        <p className="text-xs text-ink-3">{o.where}</p>
                        <ul className="mt-2 space-y-0.5 text-sm">{o.lines.map((l) => <li key={l.dish}><span className="font-semibold">{l.qty}×</span> {l.dish}</li>)}</ul>
                        {o.note && <p className="mt-2 flex items-center gap-1.5 rounded-md bg-warn-soft px-2 py-1 text-xs font-medium text-warn"><TriangleAlert className="size-3.5" />{o.note}</p>}
                        <Button className="mt-3 w-full" variant={s === "pronto" ? "primary" : "secondary"} onClick={() => advance(o.id)}>{STATUS[s].action}</Button>
                      </div>
                    ))}
                    {!orders.some((o) => o.status === s) && <p className="rounded-xl border border-dashed border-line px-3 py-8 text-center text-xs text-ink-3">Nada aqui agora</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === "estoque" && (
            <Card>
              <Table>
                <thead><tr><Th>Ingrediente</Th><Th className="text-right">Em estoque</Th><Th className="hidden w-1/3 sm:table-cell">Nível</Th><Th className="hidden text-right sm:table-cell">Mínimo</Th><Th /></tr></thead>
                <tbody>
                  {stock.map((s) => {
                    const isLow = s.qty <= s.min, pct = Math.min(100, (s.qty / (s.min * 3)) * 100);
                    return (
                      <Tr key={s.name}>
                        <Td className="font-medium">{s.name} {isLow && <Badge tone="warn" className="ml-1.5"><TriangleAlert /> Acabando</Badge>}</Td>
                        <Td className="text-right tabular">{fmtQty(s.qty, s.unit)}</Td>
                        <Td className="hidden sm:table-cell"><div className="h-1.5 overflow-hidden rounded-full bg-surface-3"><div className={cn("h-full rounded-full transition-all duration-500", isLow ? "bg-warn" : "bg-brand")} style={{ width: `${pct}%` }} /></div></Td>
                        <Td className="hidden text-right tabular text-ink-3 sm:table-cell">{fmtQty(s.min, s.unit)}</Td>
                        <Td className="text-right"><Button size="sm" variant="ghost" onClick={() => restock(s.name)}><Plus /> Registrar compra</Button></Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
