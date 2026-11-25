"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, ChefHat, Minus, Plus, Receipt, Send, Trash2, UserRound, Users, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { RelativeTime } from "@/components/ui/relative-time";
import { useRealtimeOrders } from "@/components/orders/use-realtime";
import { addToTabAction, cancelTabAction, closeTabAction, openTabAction } from "@/app/(app)/comandas/actions";
import { STATUS_META } from "@/lib/orders";
import { PAYMENT_METHODS } from "@/lib/validation";
import { formatTime } from "@/lib/dates";
import { cn, formatMoney } from "@/lib/utils";
import type { MenuCategory, MenuItem, OrderStatus } from "@/lib/types";

export interface TabRow {
  id: string; number: number; label: string; customer_name: string | null; guests: number | null;
  status: "open" | "closed" | "cancelled"; subtotal: number; service_fee: number; total: number; payment_method: string | null;
  opened_at: string; closed_at: string | null; opened_by: string | null;
  orders: { id: string; number: number; status: OrderStatus; total: number; created_at: string; order_items: { id: string; name: string; quantity: number; unit_price: number; modifiers: string | null; total: number }[] }[];
}

const running = (t: TabRow) => t.orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.total), 0);

export function TabsBoard({ open, closed, menu, categories, staffNames, restaurantId, currency, locale, timezone, canEdit }: {
  open: TabRow[]; closed: TabRow[]; menu: MenuItem[]; categories: MenuCategory[]; staffNames: Record<string, string>;
  restaurantId: string; currency: string; locale: string; timezone: string; canEdit: boolean;
}) {
  useRealtimeOrders(restaurantId, 20000);
  const [view, setView] = useState<"open" | "closed">("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const money = (v: number) => formatMoney(v, currency, locale);
  const list = view === "open" ? open : closed;
  const selected = [...open, ...closed].find((t) => t.id === selectedId) ?? null;
  const openTotal = open.reduce((s, t) => s + running(t), 0);

  return (
    <div>
      <PageHeader title="Comandas" description="Abra uma comanda por mesa ou cliente, vá adicionando itens e feche a conta no final."
        actions={canEdit && <Button variant="primary" size="lg" onClick={() => setNewOpen(true)}><Plus /> Abrir comanda</Button>} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4"><p className="text-[13px] text-ink-3">Comandas abertas</p><p className="mt-1.5 text-2xl font-semibold tabular">{open.length}</p></Card>
        <Card className="p-4"><p className="text-[13px] text-ink-3">Em aberto agora</p><p className="mt-1.5 text-2xl font-semibold tabular">{money(openTotal)}</p></Card>
        <Card className="p-4"><p className="text-[13px] text-ink-3">Fechadas (7 dias)</p><p className="mt-1.5 text-2xl font-semibold tabular">{closed.filter((t) => t.status === "closed").length}</p></Card>
        <Card className="p-4"><p className="text-[13px] text-ink-3">Recebido em comandas (7 dias)</p><p className="mt-1.5 text-2xl font-semibold tabular">{money(closed.filter((t) => t.status === "closed").reduce((s, t) => s + Number(t.total), 0))}</p></Card>
      </div>

      <Segmented size="md" ariaLabel="Ver comandas" value={view} onChange={setView} options={[{ value: "open", label: `Abertas (${open.length})` }, { value: "closed", label: "Fechadas" }]} className="mb-4" />

      {list.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((t) => {
            const preparing = t.orders.filter((o) => ["new", "accepted", "preparing"].includes(o.status)).length;
            const ready = t.orders.filter((o) => o.status === "ready").length;
            const items = t.orders.filter((o) => o.status !== "cancelled").flatMap((o) => o.order_items).reduce((s, i) => s + i.quantity, 0);
            return (
              <button key={t.id} onClick={() => setSelectedId(t.id)} className="group rounded-xl bg-surface p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-pop focus-visible:ring-2 focus-visible:ring-brand">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-ink-3">Comanda #{t.number}</p>
                    <p className="truncate text-xl font-semibold">{t.label}</p>
                  </div>
                  {t.status === "open" ? <Badge tone="good">Aberta</Badge> : t.status === "closed" ? <Badge tone="neutral">Fechada</Badge> : <Badge tone="bad">Cancelada</Badge>}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
                  {t.customer_name && <span className="flex items-center gap-1"><UserRound className="size-3.5" />{t.customer_name}</span>}
                  {t.guests && <span className="flex items-center gap-1"><Users className="size-3.5" />{t.guests}</span>}
                  {t.opened_by && staffNames[t.opened_by] && <span>por {staffNames[t.opened_by]}</span>}
                </div>
                <div className="mt-4 flex items-end justify-between gap-2">
                  <div>
                    <p className="text-2xl font-semibold tabular">{money(t.status === "open" ? running(t) : Number(t.total))}</p>
                    <p className="text-xs text-ink-3">{items} {items === 1 ? "item" : "itens"} · {t.status === "open" ? <>aberta há <RelativeTime date={t.opened_at} /></> : t.closed_at ? formatTime(t.closed_at, locale, timezone) : ""}</p>
                  </div>
                  {t.status === "open" && (preparing > 0 || ready > 0) && (
                    <div className="flex flex-col items-end gap-1">
                      {preparing > 0 && <Badge tone="warn"><ChefHat /> {preparing} na cozinha</Badge>}
                      {ready > 0 && <Badge tone="good">{ready} pronto{ready > 1 ? "s" : ""}</Badge>}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <Card><EmptyState icon={<Receipt />} title={view === "open" ? "Nenhuma comanda aberta" : "Nenhuma comanda fechada nos últimos 7 dias"}
          description={view === "open" ? "Abra uma comanda quando o cliente sentar — por mesa (Mesa 4) ou pelo número da comanda." : "As comandas fechadas e canceladas aparecem aqui."}
          action={view === "open" && canEdit ? <Button variant="primary" onClick={() => setNewOpen(true)}><Plus /> Abrir comanda</Button> : undefined} /></Card>
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        {newOpen && <NewTabDialog openLabels={open.map((t) => t.label.toLowerCase())} onDone={(id) => { setNewOpen(false); if (id) setSelectedId(id); }} />}
      </Dialog>
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        {selected && <TabDetail tab={selected} menu={menu} categories={categories} money={money} locale={locale} timezone={timezone} canEdit={canEdit && selected.status === "open"} staffNames={staffNames} onClosed={() => setSelectedId(null)} />}
      </Dialog>
    </div>
  );
}

function NewTabDialog({ openLabels, onDone }: { openLabels: string[]; onDone: (id?: string) => void }) {
  const router = useRouter();
  const [kind, setKind] = useState<"mesa" | "comanda" | "balcao">("mesa");
  const [num, setNum] = useState("");
  const [customer, setCustomer] = useState("");
  const [guests, setGuests] = useState("");
  const [pending, start] = useTransition();
  const label = kind === "balcao" ? (customer.trim() ? `Balcão — ${customer.trim()}` : "Balcão") : `${kind === "mesa" ? "Mesa" : "Comanda"} ${num.trim()}`.trim();
  const valid = kind === "balcao" || num.trim().length > 0;
  const duplicate = openLabels.includes(label.toLowerCase());

  return (
    <DialogContent size="sm" title="Abrir comanda" description="Depois é só ir adicionando os itens."
      footer={<><Button variant="ghost" onClick={() => onDone()}>Cancelar</Button><Button variant="primary" size="lg" loading={pending} disabled={!valid} onClick={() => start(async () => {
        const r = await openTabAction({ label, customer_name: customer, guests: guests ? Number(guests) : null });
        if (!r.ok) return void toast.error(r.error);
        toast.success(`${label} aberta`); router.refresh(); onDone(r.data?.id);
      })}>Abrir {label}</Button></>}>
      <div className="flex flex-col gap-4">
        <Segmented size="md" ariaLabel="Tipo" value={kind} onChange={setKind} options={[{ value: "mesa", label: "Mesa" }, { value: "comanda", label: "Nº da comanda" }, { value: "balcao", label: "Balcão" }]} />
        {kind !== "balcao" && (
          <div>
            <Field label={kind === "mesa" ? "Número da mesa" : "Número da comanda"} htmlFor="tab-num">
              <Input id="tab-num" autoFocus inputMode="numeric" className="h-12 text-lg" value={num} onChange={(e) => setNum(e.target.value)} placeholder="ex.: 4" />
            </Field>
            {kind === "mesa" && (
              <div className="mt-2 grid grid-cols-6 gap-1.5">
                {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((n) => (
                  <button key={n} type="button" onClick={() => setNum(n)} className={cn("h-10 rounded-md text-sm font-medium ring-1 ring-line transition hover:bg-surface-3", num === n && "bg-brand text-brand-foreground ring-brand", openLabels.includes(`mesa ${n}`) && num !== n && "text-ink-3 line-through")}>{n}</button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="grid grid-cols-[1fr_100px] gap-3">
          <Field label="Nome do cliente (opcional)" htmlFor="tab-customer"><Input id="tab-customer" value={customer} onChange={(e) => setCustomer(e.target.value)} /></Field>
          <Field label="Pessoas" htmlFor="tab-guests"><Input id="tab-guests" type="number" min={1} max={200} value={guests} onChange={(e) => setGuests(e.target.value)} /></Field>
        </div>
        {duplicate && <p className="rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">Já existe uma comanda aberta para “{label}”. Você pode abrir outra mesmo assim.</p>}
      </div>
    </DialogContent>
  );
}

interface Line { key: string; item: MenuItem; quantity: number; modifiers: string }

function TabDetail({ tab, menu, categories, money, locale, timezone, canEdit, staffNames, onClosed }: {
  tab: TabRow; menu: MenuItem[]; categories: MenuCategory[]; money: (v: number) => string; locale: string; timezone: string;
  canEdit: boolean; staffNames: Record<string, string>; onClosed: () => void;
}) {
  const router = useRouter();
  const [cat, setCat] = useState("all");
  const [lines, setLines] = useState<Line[]>([]);
  const [closing, setClosing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pending, start] = useTransition();
  const shown = useMemo(() => (cat === "all" ? menu : menu.filter((m) => m.category_id === cat)), [menu, cat]);
  const subtotal = running(tab);
  const cartTotal = lines.reduce((s, l) => s + l.item.price * l.quantity, 0);
  const batches = [...tab.orders].sort((a, b) => a.created_at.localeCompare(b.created_at));

  function add(item: MenuItem) {
    setLines((ls) => {
      const ex = ls.find((l) => l.item.id === item.id && !l.modifiers);
      return ex ? ls.map((l) => (l === ex ? { ...l, quantity: Math.min(l.quantity + 1, 99) } : l)) : [...ls, { key: `${item.id}-${Date.now()}`, item, quantity: 1, modifiers: "" }];
    });
  }
  function send() {
    start(async () => {
      const r = await addToTabAction(tab.id, lines.map((l) => ({ menu_item_id: l.item.id, quantity: l.quantity, modifiers: l.modifiers })));
      if (!r.ok) return void toast.error(r.error);
      toast.success("Enviado para a cozinha"); setLines([]); router.refresh();
    });
  }

  return (
    <DialogContent title={`${tab.label} · comanda #${tab.number}`} size="lg" className="max-w-6xl"
      description={`${tab.customer_name ? `${tab.customer_name} · ` : ""}aberta às ${formatTime(tab.opened_at, locale, timezone)}${tab.opened_by && staffNames[tab.opened_by] ? ` por ${staffNames[tab.opened_by]}` : ""}`}
      footer={<div className="flex w-full flex-wrap items-center gap-3">
        {canEdit && <Button variant="danger-ghost" onClick={() => setConfirmCancel(true)}><Ban /> Cancelar comanda</Button>}
        <span className="ml-auto text-sm text-ink-2">Total da comanda <strong className="text-lg text-ink tabular">{money(tab.status === "open" ? subtotal : Number(tab.total))}</strong></span>
        {canEdit && <Button variant="primary" size="lg" disabled={subtotal === 0 || lines.length > 0} onClick={() => setClosing(true)} title={lines.length ? "Envie ou limpe os itens novos antes de fechar" : undefined}><Receipt /> Fechar conta</Button>}
      </div>}>
      <div className={cn("grid gap-5", canEdit && "lg:grid-cols-[1fr_1.15fr]")}>
        {/* What was already ordered */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-3">Já pedido</p>
          {batches.length ? batches.map((o) => (
            <div key={o.id} className={cn("rounded-lg ring-1 ring-line", o.status === "cancelled" && "opacity-50")}>
              <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2 text-xs">
                <span className="text-ink-3">Pedido #{o.number} · {formatTime(o.created_at, locale, timezone)}</span>
                <Badge tone={STATUS_META[o.status].tone}>{STATUS_META[o.status].label}</Badge>
              </div>
              <ul className="px-3 py-2">
                {o.order_items.map((i) => (
                  <li key={i.id} className="flex justify-between gap-3 py-1 text-sm">
                    <span><span className="font-semibold tabular">{i.quantity}×</span> {i.name}{i.modifiers && <span className="block pl-6 text-xs text-accent">{i.modifiers}</span>}</span>
                    <span className="tabular text-ink-2">{money(Number(i.total))}</span>
                  </li>
                ))}
              </ul>
            </div>
          )) : <p className="rounded-lg bg-surface-2 px-4 py-6 text-center text-sm text-ink-3">Nada pedido ainda. Toque nos itens do cardápio ao lado.</p>}
          {tab.status === "closed" && (
            <dl className="rounded-lg bg-surface-2 p-3 text-sm">
              <div className="flex justify-between"><dt className="text-ink-2">Consumo</dt><dd className="tabular">{money(Number(tab.subtotal))}</dd></div>
              {Number(tab.service_fee) > 0 && <div className="flex justify-between"><dt className="text-ink-2">Taxa de serviço</dt><dd className="tabular">{money(Number(tab.service_fee))}</dd></div>}
              <div className="mt-1 flex justify-between border-t border-line pt-1 font-semibold"><dt>Total pago</dt><dd className="tabular">{money(Number(tab.total))}</dd></div>
              {tab.payment_method && <p className="mt-1 text-xs text-ink-3">Pago com {PAYMENT_METHODS.find((p) => p.value === tab.payment_method)?.label ?? tab.payment_method}</p>}
            </dl>
          )}
        </div>

        {/* Add more */}
        {canEdit && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-3">Adicionar itens</p>
            {menu.length ? (
              <>
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {[{ id: "all", name: "Todos" }, ...categories].map((c) => (
                    <button key={c.id} onClick={() => setCat(c.id)} className={cn("whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition", cat === c.id ? "bg-brand text-brand-foreground" : "bg-surface-3 text-ink-2 hover:text-ink")}>{c.name}</button>
                  ))}
                </div>
                <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
                  {shown.map((m) => {
                    const n = lines.filter((l) => l.item.id === m.id).reduce((s, l) => s + l.quantity, 0);
                    return (
                      <button key={m.id} onClick={() => add(m)} className={cn("relative flex min-h-[76px] flex-col justify-between rounded-lg p-3 text-left ring-1 ring-line transition hover:bg-surface-2 active:scale-[0.97]", n && "ring-2 ring-brand")}>
                        <span className="line-clamp-2 text-sm font-medium leading-5">{m.name}</span>
                        <span className="text-xs text-ink-3 tabular">{money(m.price)}</span>
                        {n > 0 && <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-foreground">{n}</span>}
                      </button>
                    );
                  })}
                </div>
                {lines.length > 0 && (
                  <div className="rounded-lg bg-surface-2 p-3">
                    <ul className="flex flex-col gap-2">
                      {lines.map((l) => (
                        <li key={l.key} className="rounded-md bg-surface p-2 shadow-card">
                          <div className="flex items-center gap-2">
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">{l.item.name}</span>
                            <div className="flex items-center rounded-md ring-1 ring-line">
                              <button className="p-2 text-ink-2" aria-label="Diminuir" onClick={() => (l.quantity > 1 ? setLines(lines.map((x) => (x.key === l.key ? { ...x, quantity: x.quantity - 1 } : x))) : setLines(lines.filter((x) => x.key !== l.key)))}>{l.quantity > 1 ? <Minus className="size-4" /> : <Trash2 className="size-4" />}</button>
                              <span className="w-6 text-center text-sm tabular">{l.quantity}</span>
                              <button className="p-2 text-ink-2" aria-label="Aumentar" onClick={() => setLines(lines.map((x) => (x.key === l.key ? { ...x, quantity: Math.min(x.quantity + 1, 99) } : x)))}><Plus className="size-4" /></button>
                            </div>
                          </div>
                          <Input className="mt-2 h-9 text-sm" placeholder="Observação (ex.: sem cebola)" value={l.modifiers} onChange={(e) => setLines(lines.map((x) => (x.key === l.key ? { ...x, modifiers: e.target.value } : x)))} aria-label={`Observação para ${l.item.name}`} />
                        </li>
                      ))}
                    </ul>
                    <Button variant="primary" size="xl" className="mt-3 w-full" loading={pending} onClick={send}><Send /> Enviar para a cozinha · {money(cartTotal)}</Button>
                  </div>
                )}
              </>
            ) : <EmptyState icon={<UtensilsCrossed />} title="Cardápio vazio" description="Cadastre os itens do cardápio para lançar na comanda." />}
          </div>
        )}
      </div>

      <Dialog open={closing} onOpenChange={setClosing}>
        {closing && <CloseTabDialog tab={tab} subtotal={subtotal} money={money} onDone={(ok) => { setClosing(false); if (ok) { router.refresh(); onClosed(); } }} />}
      </Dialog>
      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent size="sm" title={`Cancelar ${tab.label}?`} description="Os pedidos que ainda não foram concluídos são cancelados na cozinha."
          footer={<><Button variant="ghost" onClick={() => setConfirmCancel(false)}>Voltar</Button><Button variant="danger" loading={pending} onClick={() => start(async () => {
            const r = await cancelTabAction(tab.id);
            if (!r.ok) return void toast.error(r.error);
            toast.success("Comanda cancelada"); setConfirmCancel(false); router.refresh(); onClosed();
          })}>Cancelar comanda</Button></>}><span /></DialogContent>
      </Dialog>
    </DialogContent>
  );
}

function CloseTabDialog({ tab, subtotal, money, onDone }: { tab: TabRow; subtotal: number; money: (v: number) => string; onDone: (ok: boolean) => void }) {
  const [method, setMethod] = useState("pix");
  const [withFee, setWithFee] = useState(true);
  const [pct, setPct] = useState("10");
  const [pending, start] = useTransition();
  const fee = withFee ? Math.round(subtotal * Number(pct || 0)) / 100 : 0;
  const stillCooking = tab.orders.filter((o) => ["new", "accepted", "preparing"].includes(o.status)).length;
  return (
    <DialogContent size="sm" title={`Fechar conta · ${tab.label}`}
      footer={<><Button variant="ghost" onClick={() => onDone(false)}>Voltar</Button><Button variant="primary" size="lg" loading={pending} onClick={() => start(async () => {
        const r = await closeTabAction(tab.id, method, withFee ? Number(pct || 0) : 0);
        if (!r.ok) return void toast.error(r.error);
        toast.success(`${tab.label} fechada · ${money(subtotal + fee)}`); onDone(true);
      })}>Confirmar pagamento</Button></>}>
      <div className="flex flex-col gap-4">
        {stillCooking > 0 && <p className="rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">{stillCooking} {stillCooking === 1 ? "pedido ainda está" : "pedidos ainda estão"} na cozinha. Ao fechar, {stillCooking === 1 ? "ele será marcado" : "eles serão marcados"} como concluído{stillCooking === 1 ? "" : "s"}.</p>}
        <Field label="Forma de pagamento" htmlFor="pay">
          <Select id="pay" className="h-11" value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAYMENT_METHODS.filter((p) => p.value !== "platform_payout").map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
        </Field>
        <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2.5">
          <label className="flex items-center gap-3 text-sm font-medium"><Switch checked={withFee} onCheckedChange={setWithFee} /> Taxa de serviço</label>
          {withFee && <div className="flex items-center gap-1"><Input type="number" min={0} max={30} className="h-9 w-16 text-right" value={pct} onChange={(e) => setPct(e.target.value)} aria-label="Porcentagem da taxa" /><span className="text-sm text-ink-3">%</span></div>}
        </div>
        <dl className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between text-ink-2"><dt>Consumo</dt><dd className="tabular">{money(subtotal)}</dd></div>
          {fee > 0 && <div className="flex justify-between text-ink-2"><dt>Taxa de serviço ({pct}%)</dt><dd className="tabular">{money(fee)}</dd></div>}
          <div className="flex justify-between border-t border-line pt-2 text-lg font-semibold"><dt>Total a receber</dt><dd className="tabular">{money(subtotal + fee)}</dd></div>
        </dl>
      </div>
    </DialogContent>
  );
}
