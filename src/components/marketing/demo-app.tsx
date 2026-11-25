"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Camera, ChevronRight, Info, Lock, Menu as MenuIcon, Plus, Receipt, RotateCcw, Send, Sparkles, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { CheffeDataLogo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { CategoryBars, RevenueChart, RevenueExpenseChart, SimpleBars } from "@/components/dashboard/charts";
import { cn, initials } from "@/lib/utils";
import { IconChart, IconKitchen, IconLink, IconMoney, IconOrders, IconStock, IconTab, IconTeam } from "./icons";

/* ================================================================== fake data
 * Everything here is fictitious and lives only in this browser tab.            */
type Status = "novo" | "preparo" | "pronto" | "concluido" | "cancelado";
interface Line { dish: string; qty: number }
interface Order { id: number; where: string; channel: "Salão" | "Delivery" | "Balcão"; lines: Line[]; status: Status; minutes: number; note?: string; simulated?: boolean; by?: string }
interface StockItem { name: string; unit: string; qty: number; min: number; cost: number }
interface Tab { table: number; items: Line[]; sent: Line[]; openedBy: string }

const MENU: Record<string, { price: number; category: string; uses: Record<string, number> }> = {
  "Smash burger": { price: 32.9, category: "Hambúrgueres", uses: { "Carne bovina": 0.12, "Pão brioche": 1, "Queijo cheddar": 0.03 } },
  "Cheese bacon": { price: 38.9, category: "Hambúrgueres", uses: { "Carne bovina": 0.15, "Pão brioche": 1, "Queijo cheddar": 0.04, Bacon: 0.04 } },
  "Batata frita": { price: 19.9, category: "Acompanhamentos", uses: { Batata: 0.25 } },
  "Milk-shake": { price: 21.9, category: "Sobremesas", uses: { "Sorvete de baunilha": 0.2 } },
  Refrigerante: { price: 7.5, category: "Bebidas", uses: { "Refrigerante lata": 1 } },
};
const DISHES = Object.keys(MENU);

const INITIAL_STOCK: StockItem[] = [
  { name: "Carne bovina", unit: "kg", qty: 4.2, min: 2, cost: 42 },
  { name: "Pão brioche", unit: "un", qty: 38, min: 20, cost: 1.6 },
  { name: "Queijo cheddar", unit: "kg", qty: 0.9, min: 0.6, cost: 58 },
  { name: "Bacon", unit: "kg", qty: 0.5, min: 0.5, cost: 49 },
  { name: "Batata", unit: "kg", qty: 6, min: 3, cost: 7.5 },
  { name: "Sorvete de baunilha", unit: "kg", qty: 1.4, min: 1, cost: 32 },
  { name: "Refrigerante lata", unit: "un", qty: 30, min: 24, cost: 3.1 },
];

const INITIAL_ORDERS: Order[] = [
  { id: 1048, where: "Mesa 7", channel: "Salão", lines: [{ dish: "Cheese bacon", qty: 2 }, { dish: "Batata frita", qty: 1 }], status: "novo", minutes: 1, note: "Um sem cebola", by: "Mia" },
  { id: 1047, where: "App de delivery", channel: "Delivery", lines: [{ dish: "Smash burger", qty: 1 }, { dish: "Milk-shake", qty: 1 }], status: "preparo", minutes: 6, simulated: true },
  { id: 1046, where: "Retirada · Ana", channel: "Balcão", lines: [{ dish: "Smash burger", qty: 3 }], status: "preparo", minutes: 11, by: "Ethan" },
  { id: 1045, where: "Mesa 2", channel: "Salão", lines: [{ dish: "Batata frita", qty: 2 }, { dish: "Refrigerante", qty: 3 }], status: "pronto", minutes: 14, by: "Mia" },
  { id: 1044, where: "Mesa 5", channel: "Salão", lines: [{ dish: "Cheese bacon", qty: 1 }, { dish: "Refrigerante", qty: 1 }], status: "concluido", minutes: 28, by: "Daniel" },
];

const INITIAL_TABS: Tab[] = [
  { table: 3, items: [], sent: [{ dish: "Smash burger", qty: 2 }, { dish: "Refrigerante", qty: 2 }], openedBy: "Mia" },
  { table: 8, items: [], sent: [{ dish: "Cheese bacon", qty: 1 }, { dish: "Batata frita", qty: 1 }, { dish: "Milk-shake", qty: 1 }], openedBy: "Daniel" },
];

const HOURS = [
  { label: "11h", revenue: 186 }, { label: "12h", revenue: 742 }, { label: "13h", revenue: 918 }, { label: "14h", revenue: 401 },
  { label: "15h", revenue: 164 }, { label: "16h", revenue: 122 }, { label: "17h", revenue: 288 }, { label: "18h", revenue: 615 },
  { label: "19h", revenue: 1104 }, { label: "20h", revenue: 860 },
];

const MONTH = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(2026, 9, 27 + i);
  const weekend = [0, 5, 6].includes(d.getDay());
  return { label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`, revenue: Math.round(2600 + ((i * 37) % 900) + (weekend ? 1500 : 0)), expenses: Math.round(1300 + ((i * 53) % 1300) + (i % 7 === 0 ? 2200 : 0)) };
});
const EXPENSES = [
  { label: "Ingredientes", amount: 22302 }, { label: "Salários", amount: 14750 }, { label: "Aluguel", amount: 10500 },
  { label: "Taxas de delivery", amount: 6050 }, { label: "Energia", amount: 1600 }, { label: "Marketing", amount: 875 },
];
const TRANSACTIONS = [
  { date: "25/11", text: "41 pedidos concluídos", amount: 2416.9 }, { date: "25/11", text: "Entrega do açougue", amount: -612.4 },
  { date: "24/11", text: "Pães e padaria", amount: -186.0 }, { date: "24/11", text: "46 pedidos concluídos", amount: 2890.5 },
  { date: "23/11", text: "Conserto da fritadeira", amount: -1450 }, { date: "23/11", text: "Evento privado — aniversário", amount: 3375 },
];

const TEAM = [
  { name: "Mia Tavares", role: "Garçonete", onShift: "10:02", hours: 31.5, orders: 64, tables: 38, sales: 4980 },
  { name: "Daniel Costa", role: "Gerente de salão", onShift: "09:55", hours: 38, orders: 41, tables: 22, sales: 3312 },
  { name: "Ethan Paiva", role: "Caixa", onShift: null, hours: 26, orders: 72, tables: 0, sales: 2875 },
  { name: "Lucas Ferreira", role: "Chef de cozinha", onShift: "09:30", hours: 40.5, orders: 0, tables: 0, sales: 0 },
  { name: "Sofia Martins", role: "Cozinheira", onShift: null, hours: 29, orders: 0, tables: 0, sales: 0 },
];
const PUNCHES = [
  { name: "Mia Tavares", day: "qua 25/11", in: "10:02", out: null },
  { name: "Daniel Costa", day: "qua 25/11", in: "09:55", out: null },
  { name: "Lucas Ferreira", day: "qua 25/11", in: "09:30", out: null },
  { name: "Ethan Paiva", day: "ter 24/11", in: "16:01", out: "23:04" },
  { name: "Sofia Martins", day: "ter 24/11", in: "10:00", out: "17:08" },
];

const STATUS: Record<Status, { label: string; tone: "info" | "warn" | "good" | "neutral" | "bad"; next?: Status; action?: string }> = {
  novo: { label: "Novo", tone: "info", next: "preparo", action: "Começar preparo" },
  preparo: { label: "Em preparo", tone: "warn", next: "pronto", action: "Marcar como pronto" },
  pronto: { label: "Pronto", tone: "good", next: "concluido", action: "Concluir pedido" },
  concluido: { label: "Concluído", tone: "neutral" },
  cancelado: { label: "Cancelado", tone: "bad" },
};

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const linesTotal = (lines: Line[]) => lines.reduce((s, l) => s + MENU[l.dish]!.price * l.qty, 0);
const total = (o: Order) => linesTotal(o.lines);
const fmtQty = (v: number, unit: string) => `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: unit === "un" ? 0 : 2 }).format(v)} ${unit}`;
const dishCost = (dish: string, stock: StockItem[]) => Object.entries(MENU[dish]!.uses).reduce((s, [k, q]) => s + q * (stock.find((x) => x.name === k)?.cost ?? 0), 0);
const addLine = (lines: Line[], dish: string, qty = 1) => (lines.some((l) => l.dish === dish) ? lines.map((l) => (l.dish === dish ? { ...l, qty: l.qty + qty } : l)) : [...lines, { dish, qty }]);

/* ================================================================== app */
type View = "painel" | "pedidos" | "cozinha" | "comandas" | "financas" | "estoque" | "cardapio" | "equipe" | "assistente" | "integracoes";

const INTRO: Record<View, string> = {
  painel: "Como está o dia de hoje, em segundos.",
  pedidos: "Todos os pedidos numa fila só. Clique num pedido para ver os detalhes.",
  cozinha: "A tela que fica no tablet da cozinha. Toque para avançar.",
  comandas: "O garçom abre a mesa no tablet, lança os itens e fecha a conta.",
  financas: "Quanto entrou, quanto saiu e quanto sobrou no mês.",
  estoque: "Baixa sozinho a cada pedido concluído, pela ficha técnica.",
  cardapio: "Preço, custo dos ingredientes e margem de cada prato.",
  equipe: "Quem está no turno, o ponto com selfie e quanto cada um vendeu.",
  assistente: "Pergunte sobre o restaurante e receba a resposta com os seus números.",
  integracoes: "Pedidos dos apps de delivery na mesma fila da cozinha.",
};

export function DemoApp() {
  const [view, setView] = useState<View>("painel");
  const [navOpen, setNavOpen] = useState(false);
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [stock, setStock] = useState(INITIAL_STOCK);
  const [hours, setHours] = useState(HOURS);
  const [tabs, setTabs] = useState(INITIAL_TABS);
  const [nextId, setNextId] = useState(1049);
  const [selected, setSelected] = useState<number | null>(null);

  function completeOrder(o: Order) {
    const used: Record<string, number> = {};
    for (const l of o.lines) for (const [k, v] of Object.entries(MENU[l.dish]!.uses)) used[k] = (used[k] ?? 0) + v * l.qty;
    setStock((prev) => prev.map((s) => (used[s.name] ? { ...s, qty: Math.max(0, +(s.qty - used[s.name]!).toFixed(3)) } : s)));
    setHours((prev) => prev.map((h, i) => (i === prev.length - 1 ? { ...h, revenue: +(h.revenue + total(o)).toFixed(2) } : h)));
    return Object.keys(used).length;
  }

  function advance(id: number) {
    const o = orders.find((x) => x.id === id);
    if (!o) return;
    const to = STATUS[o.status].next;
    if (!to) return;
    setOrders((prev) => prev.map((x) => (x.id === id ? { ...x, status: to } : x)));
    if (to === "concluido") {
      const n = completeOrder(o);
      toast.success(`Pedido #${id} concluído`, { description: `${brl(total(o))} lançado no caixa e ${n} ingredientes baixados do estoque.` });
    } else toast(`Pedido #${id}: ${STATUS[to].label.toLowerCase()}`);
  }

  function cancel(id: number) {
    setOrders((prev) => prev.map((x) => (x.id === id ? { ...x, status: "cancelado" } : x)));
    toast(`Pedido #${id} cancelado`);
  }

  function newOrder(o: Omit<Order, "id" | "status" | "minutes">, message: string) {
    const n = nextId;
    setOrders((prev) => [{ ...o, id: n, status: "novo", minutes: 0 }, ...prev]);
    setNextId(n + 1);
    toast(`Pedido novo #${n} · ${o.where}`, { description: message });
  }

  function simulate() {
    const n = nextId;
    const places = [["Mesa " + ((n % 12) + 1), "Salão"], ["App de delivery", "Delivery"], ["Retirada", "Balcão"]] as const;
    const [where, channel] = places[n % 3]!;
    newOrder({ where, channel, lines: [{ dish: DISHES[n % DISHES.length]!, qty: (n % 2) + 1 }, { dish: DISHES[(n + 2) % DISHES.length]!, qty: 1 }] }, "Apareceu na hora na tela da cozinha.");
  }

  function restock(name: string) {
    setStock((prev) => prev.map((s) => (s.name === name ? { ...s, qty: +(s.qty + (s.unit === "un" ? 24 : 5)).toFixed(3) } : s)));
    toast.success(`Compra de ${name} registrada`);
  }

  function reset() {
    setOrders(INITIAL_ORDERS); setStock(INITIAL_STOCK); setHours(HOURS); setTabs(INITIAL_TABS); setNextId(1049); setSelected(null);
    toast("Demonstração reiniciada");
  }

  const done = orders.filter((o) => o.status === "concluido");
  const revenue = hours.reduce((s, h) => s + h.revenue, 0);
  const count = 52 + done.length;
  const low = stock.filter((s) => s.qty <= s.min);
  const active = orders.filter((o) => ["novo", "preparo", "pronto"].includes(o.status));
  const open = orders.find((o) => o.id === selected) ?? null;

  const NAV: { key: View; label: string; icon: typeof IconOrders; count?: number; warn?: boolean }[] = [
    { key: "painel", label: "Visão geral", icon: IconChart },
    { key: "pedidos", label: "Pedidos", icon: IconOrders, count: active.length },
    { key: "cozinha", label: "Cozinha", icon: IconKitchen, count: orders.filter((o) => o.status === "novo").length },
    { key: "comandas", label: "Comandas", icon: IconTab, count: tabs.length },
    { key: "financas", label: "Finanças", icon: IconMoney },
    { key: "estoque", label: "Estoque", icon: IconStock, count: low.length || undefined, warn: true },
    { key: "cardapio", label: "Cardápio", icon: IconOrders },
    { key: "equipe", label: "Equipe e ponto", icon: IconTeam },
    { key: "assistente", label: "Assistente IA", icon: IconChart },
    { key: "integracoes", label: "Integrações", icon: IconLink },
  ];
  const go = (v: View) => { setView(v); setNavOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const nav = (
    <nav className="flex flex-col gap-0.5" aria-label="Áreas da demonstração">
      {NAV.map((n) => (
        <button key={n.key} onClick={() => go(n.key)} className={cn("flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition", view === n.key ? "bg-brand-soft font-medium text-brand" : "text-ink-2 hover:bg-surface-2 hover:text-ink")}>
          {n.key === "assistente" ? <Sparkles className="size-[18px]" /> : <n.icon className="size-[18px]" />} <span className="flex-1">{n.label}</span>
          {n.count ? <span className={cn("rounded-full px-1.5 text-[11px] tabular", n.warn ? "bg-warn-soft text-warn" : "bg-surface-3 text-ink-2")}>{n.count}</span> : null}
        </button>
      ))}
    </nav>
  );

  return (
    <div className="app-glow min-h-dvh">
      <div className="sticky top-0 z-30 border-b border-accent/30 bg-accent-soft/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-sm">
          <button className="rounded-md p-1 text-ink-2 md:hidden" onClick={() => setNavOpen(!navOpen)} aria-label="Áreas"><MenuIcon className="size-5" /></button>
          <span className="flex items-center gap-2 font-medium text-ink"><Info className="size-4 shrink-0 text-accent" /> <span className="hidden sm:inline">Demonstração com dados fictícios — clique à vontade, nada é salvo.</span><span className="sm:hidden">Demonstração · dados fictícios</span></span>
          <span className="ml-auto flex gap-2">
            <Button size="sm" variant="ghost" onClick={reset}><RotateCcw /> <span className="hidden sm:inline">Reiniciar</span></Button>
            <Button asChild size="sm" variant="primary"><Link href="/signup">Criar conta grátis <ArrowRight /></Link></Button>
          </span>
        </div>
        {navOpen && <div className="border-t border-line bg-surface p-3 md:hidden">{nav}</div>}
      </div>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-16">
            <Link href="/" className="mb-6 block px-2"><CheffeDataLogo /></Link>
            <p className="mb-2 px-2 text-xs text-ink-3">Burger da Vila (exemplo)</p>
            {nav}
            <div className="mt-6 rounded-xl bg-surface p-3.5 text-xs leading-relaxed text-ink-3 ring-1 ring-line">
              <p className="font-medium text-ink">Experimente:</p>
              <ol className="mt-1.5 list-decimal space-y-1 pl-4"><li>Abra uma comanda e mande para a cozinha.</li><li>Na Cozinha, avance o pedido até “Concluído”.</li><li>Veja o faturamento subir e o estoque baixar.</li></ol>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-4 flex gap-1 overflow-x-auto pb-1 md:hidden">
            {NAV.map((n) => <button key={n.key} onClick={() => go(n.key)} className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-sm", view === n.key ? "bg-brand text-brand-foreground" : "bg-surface-2 text-ink-2")}>{n.label}</button>)}
          </div>

          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{NAV.find((n) => n.key === view)!.label}</h1>
              <p className="mt-1 text-sm text-ink-3">{INTRO[view]}</p>
            </div>
            {(view === "pedidos" || view === "cozinha") && <Button variant="primary" onClick={simulate}><Plus /> Simular pedido novo</Button>}
          </div>

          {view === "painel" && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Card className="surface-gradient p-4"><p className="text-[13px] opacity-80">Faturamento hoje</p><p className="mt-1.5 text-2xl font-semibold tabular">{brl(revenue)}</p></Card>
                <Card className="p-4"><p className="text-[13px] text-ink-3">Pedidos</p><p className="mt-1.5 text-2xl font-semibold tabular">{count}</p></Card>
                <Card className="p-4"><p className="text-[13px] text-ink-3">Ticket médio</p><p className="mt-1.5 text-2xl font-semibold tabular">{brl(revenue / count)}</p></Card>
                <button onClick={() => go("estoque")} className="text-left"><Card className={cn("h-full p-4 transition hover:ring-1 hover:ring-warn/40", low.length && "ring-1 ring-warn/30")}><p className="text-[13px] text-ink-3">Itens acabando</p><p className={cn("mt-1.5 text-2xl font-semibold tabular", low.length && "text-warn")}>{low.length}</p></Card></button>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
                <Card>
                  <CardHeader title="Faturamento por hora" description="Hoje · conclua um pedido e veja a última barra subir" />
                  <div className="px-2 pb-3 pt-2"><RevenueChart data={hours} kind="bar" currency="BRL" locale="pt-BR" height={250} /></div>
                </Card>
                <Card>
                  <CardHeader title="Pedidos em andamento" description="Clique para abrir" />
                  <ul className="divide-y divide-line px-1 pb-2">
                    {active.slice(0, 5).map((o) => (
                      <li key={o.id}><button onClick={() => { go("pedidos"); setSelected(o.id); }} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm hover:bg-surface-2">
                        <span className="font-semibold tabular">#{o.id}</span><span className="flex-1 truncate text-ink-2">{o.where}</span><Badge tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Badge><ChevronRight className="size-4 text-ink-3" />
                      </button></li>
                    ))}
                    {!active.length && <li className="px-3 py-6 text-center text-sm text-ink-3">Nenhum pedido em andamento.</li>}
                  </ul>
                </Card>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader title="Mais vendidos hoje" description="Unidades" />
                  <div className="px-2 pb-3 pt-2"><SimpleBars height={200} format={(v) => String(Math.round(v))} data={DISHES.map((d, i) => ({ label: d, value: [24, 13, 31, 9, 27][i]! + done.reduce((s, o) => s + o.lines.filter((l) => l.dish === d).reduce((a, l) => a + l.qty, 0), 0) }))} /></div>
                </Card>
                <Card>
                  <CardHeader title="Avisos" description="O que precisa da sua atenção" />
                  <ul className="flex flex-col gap-2.5 px-4 pb-4 pt-2 text-sm">
                    {low.map((s) => <li key={s.name} className="flex gap-2"><TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" /><span><strong>{s.name}</strong> está abaixo do mínimo ({fmtQty(s.qty, s.unit)})</span></li>)}
                    <li className="flex gap-2"><Info className="mt-0.5 size-4 shrink-0 text-info" /><span>Aluguel vence em 01/12 · {brl(10500)}</span></li>
                    <li className="flex gap-2"><Info className="mt-0.5 size-4 shrink-0 text-info" /><span>{tabs.length} comandas abertas no salão</span></li>
                  </ul>
                </Card>
              </div>
            </div>
          )}

          {view === "pedidos" && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
              <Card>
                <Table>
                  <thead><tr><Th>Pedido</Th><Th>Onde</Th><Th className="hidden sm:table-cell">Canal</Th><Th>Status</Th><Th className="text-right">Total</Th></tr></thead>
                  <tbody>
                    {orders.map((o) => (
                      <Tr key={o.id} className={cn("cursor-pointer", selected === o.id && "bg-brand-soft/40")} onClick={() => setSelected(o.id)}>
                        <Td className="font-semibold tabular">#{o.id}</Td><Td>{o.where}</Td>
                        <Td className="hidden text-ink-2 sm:table-cell">{o.channel}{o.simulated && <Badge tone="accent" className="ml-1.5">Simulado</Badge>}</Td>
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
                      <div><p className="text-lg font-semibold">Pedido #{open.id}</p><p className="text-sm text-ink-3">{open.where} · {open.channel} · há {open.minutes} min{open.by ? ` · lançado por ${open.by}` : ""}</p></div>
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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

          {view === "comandas" && (
            <ComandasView tabs={tabs} setTabs={setTabs}
              onSend={(t, lines) => newOrder({ where: `Mesa ${t.table}`, channel: "Salão", lines, by: t.openedBy }, "Enviado para a cozinha pela comanda.")}
              onClose={(t, fee) => {
                const sub = linesTotal(t.sent);
                if (fee) setHours((prev) => prev.map((h, i) => (i === prev.length - 1 ? { ...h, revenue: +(h.revenue + sub * 0.1).toFixed(2) } : h)));
                toast.success(`Mesa ${t.table} fechada`, { description: `Total ${brl(sub * (fee ? 1.1 : 1))}${fee ? " com 10% de serviço" : ""}.` });
              }} />
          )}

          {view === "financas" && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Card className="surface-gradient p-4"><p className="text-[13px] opacity-80">Faturamento (30 dias)</p><p className="mt-1.5 text-2xl font-semibold tabular">{brl(MONTH.reduce((s, d) => s + d.revenue, 0))}</p></Card>
                <Card className="p-4"><p className="text-[13px] text-ink-3">Despesas</p><p className="mt-1.5 text-2xl font-semibold tabular">{brl(MONTH.reduce((s, d) => s + d.expenses, 0))}</p></Card>
                <Card className="p-4"><p className="text-[13px] text-ink-3">Lucro estimado</p><p className="mt-1.5 text-2xl font-semibold tabular text-good">{brl(MONTH.reduce((s, d) => s + d.revenue - d.expenses, 0))}</p></Card>
                <Card className="p-4"><p className="text-[13px] text-ink-3">Contas a vencer</p><p className="mt-1.5 text-2xl font-semibold tabular">3</p><p className="text-xs text-ink-3">Aluguel, energia e água</p></Card>
              </div>
              <Card>
                <CardHeader title="Faturamento x despesas" description="Últimos 30 dias" />
                <div className="px-2 pb-3 pt-2"><RevenueExpenseChart data={MONTH} kind="bar" currency="BRL" locale="pt-BR" height={260} /></div>
              </Card>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader title="Para onde vai o dinheiro" description="Despesas por categoria" />
                  <div className="p-4"><CategoryBars data={EXPENSES} currency="BRL" locale="pt-BR" /></div>
                </Card>
                <Card>
                  <CardHeader title="Últimos lançamentos" description="Entradas e saídas" />
                  <ul className="divide-y divide-line px-4 pb-2">
                    {TRANSACTIONS.map((t, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                        <span className="text-ink-3 tabular">{t.date}</span><span className="flex-1 truncate">{t.text}</span>
                        <span className={cn("font-medium tabular", t.amount > 0 ? "text-good" : "text-ink")}>{t.amount > 0 ? "+" : "−"}{brl(Math.abs(t.amount))}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
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
                        <Td className="text-right"><Button size="sm" variant="ghost" onClick={() => restock(s.name)}><Plus /> <span className="hidden sm:inline">Registrar compra</span></Button></Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card>
          )}

          {view === "cardapio" && <CardapioView stock={stock} />}
          {view === "equipe" && <EquipeView />}
          {view === "assistente" && <AssistenteView revenue={revenue} count={count} low={low} stock={stock} />}
          {view === "integracoes" && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-3 rounded-lg bg-info-soft px-4 py-3 text-sm text-info"><Info className="mt-0.5 size-4 shrink-0" /><p>As integrações com os apps estão em desenvolvimento e dependem da aprovação de cada plataforma. No CheffeData, o <strong>modo demonstração</strong> cria pedidos marcados como “Simulado”.</p></div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {([["iFood", "#EA1D2C", "iF", true], ["99Food", "#FFC700", "99", true], ["Rappi", "#FF441F", "Ra", true], ["Uber Eats", "#06C167", "UE", true], ["Stripe", "#635BFF", "S", false], ["Google", "#4285F4", "G", false]] as const).map(([name, color, short, delivery]) => (
                  <Card key={name} className="flex flex-col gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ background: color }}>{short}</span>
                      <div className="flex-1"><p className="font-semibold">{name}</p><p className="text-xs text-ink-3">{delivery ? "Delivery" : name === "Stripe" ? "Pagamentos" : "Marketing"}</p></div>
                      <Badge tone="outline">Em breve</Badge>
                    </div>
                    {delivery && <Button variant="secondary" size="sm" onClick={() => newOrder({ where: `${name} · Cliente`, channel: "Delivery", lines: [{ dish: "Smash burger", qty: 2 }, { dish: "Batata frita", qty: 1 }], simulated: true }, "Pedido simulado do app — já está na Cozinha.")}>Simular pedido do {name}</Button>}
                  </Card>
                ))}
              </div>
            </div>
          )}

          <Card className="mt-8 flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:text-left">
            <div className="flex-1"><p className="font-semibold">Gostou? Crie sua conta grátis e use com o seu restaurante.</p><p className="text-sm text-ink-3">Plano Grátis para sempre, ou teste tudo por 7 dias sem cartão.</p></div>
            <Button asChild variant="primary" size="lg"><Link href="/signup">Criar conta grátis <ArrowRight /></Link></Button>
          </Card>
        </main>
      </div>
    </div>
  );
}

/* ================================================================== comandas */
function ComandasView({ tabs, setTabs, onSend, onClose }: {
  tabs: Tab[]; setTabs: React.Dispatch<React.SetStateAction<Tab[]>>; onSend: (t: Tab, lines: Line[]) => void; onClose: (t: Tab, fee: boolean) => void;
}) {
  const [current, setCurrent] = useState<number | null>(tabs[0]?.table ?? null);
  const [fee, setFee] = useState(true);
  const tab = tabs.find((t) => t.table === current) ?? null;
  const update = (fn: (t: Tab) => Tab) => setTabs((all) => all.map((t) => (t.table === current ? fn(t) : t)));
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.3fr]">
      <Card className="h-fit p-4">
        <p className="mb-3 text-sm font-medium text-ink-2">Mesas — toque para abrir ou ver a comanda</p>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
            const t = tabs.find((x) => x.table === n);
            return (
              <button key={n} onClick={() => {
                if (!t) { setTabs((all) => [...all, { table: n, items: [], sent: [], openedBy: "Você" }]); toast.success(`Mesa ${n} aberta`); }
                setCurrent(n);
              }} className={cn("flex aspect-square flex-col items-center justify-center rounded-xl text-sm ring-1 transition", t ? "bg-brand-soft text-ink ring-brand/40" : "bg-surface-2 text-ink-3 ring-line hover:text-ink", current === n && "ring-2 ring-brand")}>
                <span className="text-lg font-semibold">{n}</span>
                <span className="text-[10px] tabular">{t ? brl(linesTotal(t.sent)) : "livre"}</span>
              </button>
            );
          })}
        </div>
      </Card>
      <Card className="p-5">
        {tab ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between"><div><p className="text-lg font-semibold">Mesa {tab.table}</p><p className="text-sm text-ink-3">Aberta por {tab.openedBy}</p></div><Badge tone="good">Aberta</Badge></div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-3">Já pedido</p>
              {tab.sent.length ? <ul className="divide-y divide-line rounded-lg bg-surface-2 px-3">{tab.sent.map((l) => <li key={l.dish} className="flex justify-between py-2 text-sm"><span>{l.qty}× {l.dish}</span><span className="tabular text-ink-2">{brl(MENU[l.dish]!.price * l.qty)}</span></li>)}</ul> : <p className="rounded-lg bg-surface-2 px-3 py-4 text-center text-sm text-ink-3">Nada pedido ainda.</p>}
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-3">Adicionar itens</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {DISHES.map((d) => {
                  const n = tab.items.find((l) => l.dish === d)?.qty ?? 0;
                  return (
                    <button key={d} onClick={() => update((t) => ({ ...t, items: addLine(t.items, d) }))} className={cn("relative rounded-lg p-3 text-left ring-1 ring-line transition hover:bg-surface-2 active:scale-[0.97]", n && "ring-2 ring-brand")}>
                      <span className="block pr-6 text-sm font-medium">{d}</span><span className="text-xs text-ink-3">{brl(MENU[d]!.price)}</span>
                      {n > 0 && <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-foreground">{n}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            {tab.items.length > 0 && (
              <Button variant="primary" size="lg" onClick={() => { onSend(tab, tab.items); update((t) => ({ ...t, sent: t.items.reduce((acc, l) => addLine(acc, l.dish, l.qty), t.sent), items: [] })); }}>
                <Send /> Enviar para a cozinha · {brl(linesTotal(tab.items))}
              </Button>
            )}
            {tab.sent.length > 0 && (
              <div className="rounded-lg bg-surface-2 p-3">
                <label className="flex items-center justify-between text-sm"><span>Taxa de serviço (10%)</span><input type="checkbox" checked={fee} onChange={(e) => setFee(e.target.checked)} className="size-4 accent-[var(--brand)]" /></label>
                <p className="mt-2 flex justify-between font-semibold"><span>Total</span><span className="tabular">{brl(linesTotal(tab.sent) * (fee ? 1.1 : 1))}</span></p>
                <Button className="mt-3 w-full" variant="secondary" onClick={() => { onClose(tab, fee); setTabs((all) => all.filter((t) => t.table !== tab.table)); setCurrent(null); }}><Receipt /> Fechar conta</Button>
              </div>
            )}
          </div>
        ) : <p className="py-12 text-center text-sm text-ink-3">Toque numa mesa para abrir a comanda.</p>}
      </Card>
    </div>
  );
}

/* ================================================================== cardápio */
function CardapioView({ stock }: { stock: StockItem[] }) {
  const [open, setOpen] = useState<string>("Cheese bacon");
  const item = MENU[open]!;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
      <Card>
        <Table>
          <thead><tr><Th>Item</Th><Th className="text-right">Preço</Th><Th className="hidden text-right sm:table-cell">Custo</Th><Th className="text-right">Margem</Th></tr></thead>
          <tbody>
            {DISHES.map((d) => {
              const cost = dishCost(d, stock), price = MENU[d]!.price, margin = ((price - cost) / price) * 100;
              return (
                <Tr key={d} className={cn("cursor-pointer", open === d && "bg-brand-soft/40")} onClick={() => setOpen(d)}>
                  <Td><span className="font-medium">{d}</span><span className="block text-xs text-ink-3">{MENU[d]!.category}</span></Td>
                  <Td className="text-right tabular">{brl(price)}</Td>
                  <Td className="hidden text-right tabular text-ink-2 sm:table-cell">{brl(cost)}</Td>
                  <Td className={cn("text-right font-medium tabular", margin < 60 ? "text-warn" : "text-good")}>{margin.toFixed(0)}%</Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
      <Card className="h-fit p-5">
        <p className="text-lg font-semibold">Ficha técnica · {open}</p>
        <p className="text-sm text-ink-3">O custo é calculado com o preço de cada ingrediente do estoque.</p>
        <ul className="mt-4 divide-y divide-line rounded-lg bg-surface-2 px-3">
          {Object.entries(item.uses).map(([k, q]) => {
            const s = stock.find((x) => x.name === k)!;
            return <li key={k} className="flex justify-between py-2.5 text-sm"><span>{k} <span className="text-ink-3">· {fmtQty(q, s.unit)}</span></span><span className="tabular text-ink-2">{brl(q * s.cost)}</span></li>;
          })}
        </ul>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-surface-2 p-2"><dt className="text-[11px] text-ink-3">Custo</dt><dd className="font-semibold tabular">{brl(dishCost(open, stock))}</dd></div>
          <div className="rounded-lg bg-surface-2 p-2"><dt className="text-[11px] text-ink-3">Preço</dt><dd className="font-semibold tabular">{brl(item.price)}</dd></div>
          <div className="rounded-lg bg-surface-2 p-2"><dt className="text-[11px] text-ink-3">Lucro</dt><dd className="font-semibold tabular text-good">{brl(item.price - dishCost(open, stock))}</dd></div>
        </dl>
      </Card>
    </div>
  );
}

/* ================================================================== equipe */
function EquipeView() {
  const [tab, setTab] = useState<"agora" | "ponto" | "desempenho">("agora");
  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-fit gap-1 rounded-lg bg-surface-2 p-1 ring-1 ring-line">
        {([["agora", "No turno"], ["ponto", "Ponto"], ["desempenho", "Desempenho"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cn("rounded-md px-3 py-1.5 text-sm", tab === k ? "bg-surface text-ink shadow-card" : "text-ink-3 hover:text-ink")}>{l}</button>
        ))}
      </div>
      {tab === "agora" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {TEAM.map((p) => (
            <Card key={p.name} className={cn("p-4", p.onShift && "ring-1 ring-good/40")}>
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-surface-3 text-sm font-semibold">{initials(p.name)}</span>
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{p.name}</p><p className="text-xs text-ink-3">{p.role}</p></div>
                {p.onShift ? <Badge tone="good">Desde {p.onShift}</Badge> : <Badge tone="neutral">Fora do turno</Badge>}
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-surface-2 p-2"><dt className="text-[11px] text-ink-3">Horas</dt><dd className="font-semibold tabular">{p.hours}h</dd></div>
                <div className="rounded-md bg-surface-2 p-2"><dt className="text-[11px] text-ink-3">Pedidos</dt><dd className="font-semibold tabular">{p.orders}</dd></div>
                <div className="rounded-md bg-surface-2 p-2"><dt className="text-[11px] text-ink-3">Mesas</dt><dd className="font-semibold tabular">{p.tables}</dd></div>
              </dl>
            </Card>
          ))}
        </div>
      )}
      {tab === "ponto" && (
        <Card>
          <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm text-ink-2"><Camera className="size-4 shrink-0 text-brand" /> Cada registro tem uma selfie de entrada e de saída (aqui, ilustradas com as iniciais).</div>
          <Table>
            <thead><tr><Th>Pessoa</Th><Th>Dia</Th><Th>Entrada</Th><Th>Saída</Th></tr></thead>
            <tbody>
              {PUNCHES.map((p, i) => (
                <Tr key={i}>
                  <Td className="font-medium">{p.name}</Td><Td className="text-ink-2">{p.day}</Td>
                  <Td><span className="flex items-center gap-2"><span className="flex size-7 items-center justify-center rounded-full bg-brand-soft text-[10px] font-semibold text-brand">{initials(p.name)}</span>{p.in}</span></Td>
                  <Td>{p.out ? <span className="flex items-center gap-2"><span className="flex size-7 items-center justify-center rounded-full bg-brand-soft text-[10px] font-semibold text-brand">{initials(p.name)}</span>{p.out}</span> : <Badge tone="good">Trabalhando</Badge>}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
      {tab === "desempenho" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
          <Card>
            <Table>
              <thead><tr><Th>Pessoa</Th><Th className="text-right">Pedidos</Th><Th className="text-right">Mesas</Th><Th className="text-right">Vendido</Th></tr></thead>
              <tbody>{TEAM.filter((p) => p.sales).map((p) => <Tr key={p.name}><Td className="font-medium">{p.name}</Td><Td className="text-right tabular">{p.orders}</Td><Td className="text-right tabular">{p.tables}</Td><Td className="text-right font-medium tabular">{brl(p.sales)}</Td></Tr>)}</tbody>
            </Table>
          </Card>
          <Card>
            <CardHeader title="Vendas por pessoa" description="Últimos 7 dias" />
            <div className="px-2 pb-3 pt-2"><SimpleBars height={220} format={(v) => brl(v)} data={TEAM.filter((p) => p.sales).map((p) => ({ label: p.name.split(" ")[0]!, value: p.sales }))} /></div>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ================================================================== assistente */
function AssistenteView({ revenue, count, low, stock }: { revenue: number; count: number; low: StockItem[]; stock: StockItem[] }) {
  const margin = (d: string) => (MENU[d]!.price - dishCost(d, stock)) / MENU[d]!.price;
  const worst = [...DISHES].sort((a, b) => margin(a) - margin(b))[0]!;
  const QA: { q: string; a: string }[] = [
    { q: "Quanto faturei hoje?", a: `Hoje você faturou **${brl(revenue)}** com ${count} pedidos — ticket médio de ${brl(revenue / count)}.` },
    { q: "O que está acabando no estoque?", a: low.length ? `Estão abaixo do mínimo: ${low.map((s) => `**${s.name}** (${fmtQty(s.qty, s.unit)})`).join(", ")}. Vale fazer o pedido ao fornecedor hoje.` : "Nada está abaixo do mínimo agora." },
    { q: "Qual prato tem a menor margem?", a: `O **${worst}**: custa ${brl(dishCost(worst, stock))} em ingredientes e é vendido por ${brl(MENU[worst]!.price)}. Rever o preço ou a porção pode ajudar.` },
    { q: "Quem vendeu mais esta semana?", a: `**Mia Tavares** vendeu ${brl(4980)} em 64 pedidos e atendeu 38 mesas.` },
    { q: "Como está o clima hoje?", a: "Eu só respondo sobre os dados do seu restaurante no CheffeData. Pergunte, por exemplo, quanto você faturou hoje." },
  ];
  const [chat, setChat] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const bold = (t: string) => t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") ? <strong key={i} className="text-ink">{p.slice(2, -2)}</strong> : p));
  return (
    <Card className="flex flex-col">
      <div className="flex items-start gap-3 border-b border-line px-4 py-3 text-sm text-ink-2"><Lock className="mt-0.5 size-4 shrink-0 text-brand" /><p><strong className="text-ink">Só usa os dados do restaurante.</strong> Sem internet e sem outras fontes. Aqui na demonstração, as respostas são montadas com os dados fictícios desta página.</p></div>
      <div className="flex min-h-64 flex-col gap-3 p-4">
        {!chat.length && <p className="py-6 text-center text-sm text-ink-3">Toque numa pergunta abaixo.</p>}
        {chat.map((m, i) => m.role === "user"
          ? <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-sm text-brand-foreground">{m.text}</div>
          : <div key={i} className="flex max-w-[90%] gap-2.5"><span className="surface-gradient flex size-7 shrink-0 items-center justify-center rounded-full"><Sparkles className="size-3.5" /></span><div className="rounded-2xl rounded-tl-md bg-surface-2 px-4 py-2.5 text-sm text-ink-2">{bold(m.text)}</div></div>)}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-line p-4">
        {QA.map((x) => <button key={x.q} onClick={() => setChat((c) => [...c, { role: "user", text: x.q }, { role: "ai", text: x.a }])} className="rounded-full bg-surface-2 px-3.5 py-2 text-sm ring-1 ring-line hover:ring-brand/40">{x.q}</button>)}
      </div>
    </Card>
  );
}
