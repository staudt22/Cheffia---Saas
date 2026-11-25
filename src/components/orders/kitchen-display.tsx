"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowLeft, Bell, BellOff, Maximize, MessageSquareText, Minimize, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SourceBadge } from "@/components/orders/source-badge";
import { useRealtimeOrders } from "@/components/orders/use-realtime";
import { updateOrderStatusAction } from "@/app/(app)/orders/actions";
import { FULFILLMENT_LABEL, STATUS_META } from "@/lib/orders";
import { formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Order, OrderStatus } from "@/lib/types";

const COLUMNS: { status: OrderStatus; title: string; accent: string }[] = [
  { status: "new", title: "Novos", accent: "bg-info" },
  { status: "accepted", title: "Aceitos", accent: "bg-accent" },
  { status: "preparing", title: "Em preparo", accent: "bg-warn" },
  { status: "ready", title: "Prontos", accent: "bg-good" },
];

function useNow(interval = 15000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), interval); return () => clearInterval(t); }, [interval]);
  return now;
}

function chime() {
  try {
    const ctx = new AudioContext();
    [0, 0.18].forEach((delay, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = i ? 1046 : 784;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + delay);
      o.stop(ctx.currentTime + delay + 0.4);
    });
  } catch {}
}

export function KitchenDisplay({ orders, lastCompleted, restaurantId, locale, timezone, canEdit }: {
  orders: Order[]; lastCompleted: { id: string; number: number } | null; restaurantId: string; locale: string; timezone: string; canEdit: boolean;
}) {
  const { live } = useRealtimeOrders(restaurantId, 20000);
  const now = useNow();
  const [optimistic, setOptimistic] = useState<Record<string, { from: OrderStatus; to: OrderStatus }>>({});
  const [sound, setSound] = useState(false);
  const [full, setFull] = useState(false);
  const [, start] = useTransition();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const seen = useRef<Set<string> | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { try { setSound(localStorage.getItem("forkly.kds.sound") === "on"); } catch {} }, []);
  useEffect(() => {
    const ids = new Set(orders.filter((o) => o.status === "new").map((o) => o.id));
    if (seen.current && sound && [...ids].some((id) => !seen.current!.has(id))) chime();
    seen.current = ids;
  }, [orders, sound]);
  useEffect(() => {
    const onFs = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const view = useMemo(() => orders.map((o) => ({ ...o, status: optimistic[o.id]?.from === o.status ? optimistic[o.id]!.to : o.status })).filter((o) => o.status !== "completed" && o.status !== "cancelled"), [orders, optimistic]);

  function move(order: Order, status: OrderStatus) {
    setOptimistic((s) => ({ ...s, [order.id]: { from: order.status, to: status } }));
    start(async () => {
      const r = await updateOrderStatusAction(order.id, status);
      if (!r.ok) { toast.error(r.error); setOptimistic((s) => { const n = { ...s }; delete n[order.id]; return n; }); }
      else if (status === "completed") toast.success(`#${order.number} concluído`, { action: { label: "Desfazer", onClick: () => start(async () => { await updateOrderStatusAction(order.id, "ready"); }) } });
    });
  }

  return (
    <div className="-mx-4 -my-6 flex min-h-[calc(100dvh-56px)] flex-col bg-bg/40 lg:-mx-8 lg:-my-8">
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-3 lg:px-6">
        <Button asChild variant="ghost" size="sm"><Link href="/orders"><ArrowLeft /> Pedidos</Link></Button>
        <h1 className="text-lg font-semibold">Tela da cozinha</h1>
        <span className={cn("flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", live ? "bg-good-soft text-good" : "bg-surface-3 text-ink-3")}>
          <span className={cn("size-1.5 rounded-full", live ? "bg-good animate-pulse-soft" : "bg-ink-3")} />{live ? "Ao vivo" : "Atualização automática"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {lastCompleted && canEdit && (
            <Button size="sm" variant="ghost" onClick={() => start(async () => { const r = await updateOrderStatusAction(lastCompleted.id, "ready"); if (!r.ok) toast.error(r.error); })}><Undo2 /> Voltar o #{lastCompleted.number}</Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => { const v = !sound; setSound(v); try { localStorage.setItem("forkly.kds.sound", v ? "on" : "off"); } catch {} if (v) chime(); }} aria-pressed={sound}>
            {sound ? <Bell /> : <BellOff />} Som {sound ? "ligado" : "desligado"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {})}>
            {full ? <Minimize /> : <Maximize />} {full ? "Sair da tela cheia" : "Tela cheia"}
          </Button>
        </div>
      </div>
      <div className="grid flex-1 grid-cols-1 gap-3 overflow-x-auto p-3 md:grid-cols-2 xl:grid-cols-4 lg:p-4">
        {COLUMNS.map((col) => {
          const list = view.filter((o) => o.status === col.status);
          return (
            <section key={col.status} className="flex min-h-48 flex-col rounded-xl bg-surface-3/70" aria-label={`Pedidos ${col.title.toLowerCase()}`}>
              <header className="flex items-center gap-2 px-3 py-2.5">
                <span className={cn("size-2 rounded-full", col.accent)} />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">{col.title}</h2>
                <span className="ml-auto rounded-full bg-surface px-2 text-xs font-semibold tabular">{list.length}</span>
              </header>
              <div className="flex flex-1 flex-col gap-2.5 px-2 pb-2">
                {list.length === 0 && <p className="py-8 text-center text-sm text-ink-3">Nenhum pedido</p>}
                {list.map((o) => {
                  const mins = Math.floor((now - new Date(o.created_at).getTime()) / 60000);
                  const late = o.estimated_prep_minutes ? mins > o.estimated_prep_minutes : mins > 20;
                  const meta = STATUS_META[o.status];
                  return (
                    <article key={o.id} className={cn("rounded-lg bg-surface shadow-card animate-slide-up", late && o.status !== "ready" && "ring-2 ring-bad/60")}>
                      <div className="flex items-start justify-between gap-2 border-b border-line px-3 py-2.5">
                        <div>
                          <p className="text-xl font-bold tabular leading-6">#{o.number}</p>
                          <p className="mt-0.5 text-xs text-ink-3">{formatTime(o.created_at, locale, timezone)} · {FULFILLMENT_LABEL[o.fulfillment]}{o.table_label ? ` · ${o.table_label}` : ""}</p>
                        </div>
                        <div className="text-right">
                          <p className={cn("text-lg font-semibold tabular leading-6", late && o.status !== "ready" ? "text-bad" : "text-ink")}>{mins}min</p>
                          {o.estimated_prep_minutes && <p className="text-[11px] text-ink-3">prev. {o.estimated_prep_minutes}min</p>}
                        </div>
                      </div>
                      <div className="px-3 py-2">
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <SourceBadge source={o.source} simulated={o.is_simulated} />
                          {o.customer_name && <span className="truncate text-xs text-ink-2">{o.customer_name}</span>}
                        </div>
                        <ul className="flex flex-col gap-1">
                          {(o.order_items ?? []).map((i) => (
                            <li key={i.id} className="text-[15px] leading-5">
                              <span className="font-semibold tabular">{i.quantity}×</span> {i.name}
                              {i.modifiers && <span className="block pl-6 text-sm font-medium text-accent">{i.modifiers}</span>}
                              {i.notes && <span className="block pl-6 text-sm text-ink-3">{i.notes}</span>}
                            </li>
                          ))}
                        </ul>
                        {o.notes && <p className="mt-2 flex gap-1.5 rounded-md bg-warn-soft px-2 py-1.5 text-sm font-medium text-warn"><MessageSquareText className="mt-0.5 size-4 shrink-0" />{o.notes}</p>}
                      </div>
                      {canEdit && meta.next && (
                        <div className="flex gap-2 px-2 pb-2">
                          {o.status === "new" && (rejecting === o.id
                            ? <Button variant="danger" size="lg" onClick={() => { setRejecting(null); move(o, "cancelled"); }} onBlur={() => setRejecting(null)}>Confirmar recusa</Button>
                            : <Button variant="ghost" size="lg" className="text-bad" onClick={() => setRejecting(o.id)}>Recusar</Button>)}
                          <Button size="lg" variant="primary" className="flex-1 text-[15px]" onClick={() => move(o, meta.next!)}>{meta.action}</Button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
