"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, ClipboardList, Clock, LogIn, LogOut, Receipt, ShoppingBag, Timer, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RelativeTime } from "@/components/ui/relative-time";
import { clockAction } from "@/app/(app)/minha-area/actions";
import { Dialog } from "@/components/ui/dialog";
import { SelfieCapture } from "@/components/team/selfie-capture";
import { createClient } from "@/lib/supabase/client";
import { STATUS_META } from "@/lib/orders";
import { formatDuration, formatTime } from "@/lib/dates";
import { cn, formatMoney } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

type Entry = { id: string; clock_in: string; clock_out: string | null; clock_in_photo?: string | null; clock_out_photo?: string | null };

function minutesBetween(a: string, b: string | null, now: number) {
  return Math.max(0, ((b ? new Date(b).getTime() : now) - new Date(a).getTime()) / 60000);
}

export function MyArea({ name, roleName, restaurantName, restaurantId, userId, requireSelfie, entries, weekStartUtc, dayStartUtc, today, week, myTabs, myOrders, showSales, currency, locale, timezone }: {
  name: string; roleName: string; restaurantName: string; restaurantId: string; userId: string; requireSelfie: boolean; entries: Entry[]; weekStartUtc: string; dayStartUtc: string;
  today: Record<string, unknown> | null; week: Record<string, unknown> | null;
  myTabs: { id: string; number: number; label: string; opened_at: string }[];
  myOrders: { id: string; number: number; status: string; total: number; table_label: string | null; created_at: string }[];
  showSales: boolean; currency: string; locale: string; timezone: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const open = entries.find((e) => !e.clock_out) ?? null;
  const sinceMin = open ? minutesBetween(open.clock_in, null, now) : 0;
  const clip = (e: Entry, from: string) => (new Date(e.clock_out ?? now).getTime() > new Date(from).getTime()
    ? minutesBetween(new Date(Math.max(new Date(e.clock_in).getTime(), new Date(from).getTime())).toISOString(), e.clock_out, now) : 0);
  const todayMin = entries.reduce((s, e) => s + clip(e, dayStartUtc), 0);
  const weekMin = entries.reduce((s, e) => s + clip(e, weekStartUtc), 0);
  const money = (v: unknown) => formatMoney(Number(v ?? 0), currency, locale);
  const n = (v: unknown) => Number(v ?? 0);
  const elapsed = `${String(Math.floor(sinceMin / 60)).padStart(2, "0")}:${String(Math.floor(sinceMin % 60)).padStart(2, "0")}:${String(Math.floor((sinceMin * 60) % 60)).padStart(2, "0")}`;

  const [selfieOpen, setSelfieOpen] = useState(false);

  function register(photo?: Blob) {
    start(async () => {
      let path: string | null = null;
      if (photo) {
        path = `${restaurantId}/${userId}/${new Date().toISOString().replace(/[:.]/g, "-")}-${open ? "saida" : "entrada"}.jpg`;
        const { error } = await createClient().storage.from("timeclock").upload(path, photo, { contentType: "image/jpeg" });
        if (error) return void toast.error("Não foi possível enviar a selfie. Verifique a internet e tente de novo.");
      }
      const r = await clockAction(path);
      if (!r.ok) return void toast.error(r.error);
      setSelfieOpen(false);
      toast.success(r.data?.status === "in" ? "Entrada registrada. Bom trabalho!" : "Saída registrada. Até a próxima!");
      router.refresh();
    });
  }
  const clock = () => (requireSelfie ? setSelfieOpen(true) : register());

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-ink-3">{restaurantName} · {roleName}</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">Olá, <span className="text-gradient">{name.split(" ")[0]}</span></h1>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
        {/* Time clock */}
        <Card className={cn("p-6 sm:p-8", open && "glow-ring")}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">Ponto eletrônico</p>
              <p className="mt-1 text-sm text-ink-3">Bata o ponto ao <strong className="text-ink-2">chegar</strong> e de novo ao <strong className="text-ink-2">ir embora</strong>.{requireSelfie && " Cada registro pede uma selfie rápida."}</p>
            </div>
            <span className={cn("flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-sm font-medium", open ? "bg-good-soft text-good" : "bg-surface-3 text-ink-2")}>
              <span className={cn("size-2 rounded-full", open ? "animate-pulse-soft bg-good" : "bg-ink-3")} />
              {open ? "No turno" : "Fora do turno"}
            </span>
          </div>

          {/* steps */}
          <ol className="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
            {[
              { n: 1, label: "Entrada", done: !!open, active: !open, detail: open ? formatTime(open.clock_in, locale, timezone) : "Ao chegar" },
              { n: 2, label: "Trabalhando", done: false, active: !!open, detail: open ? "Cronômetro ligado" : "—" },
              { n: 3, label: "Saída", done: false, active: !!open, detail: "Ao ir embora" },
            ].map((st, i) => (
              <li key={st.n} className="relative">
                {i > 0 && <span className={cn("absolute right-1/2 top-4 -z-0 h-0.5 w-full", open && i === 1 ? "bg-good" : "bg-line")} aria-hidden />}
                <span className={cn("relative z-10 mx-auto flex size-8 items-center justify-center rounded-full text-sm font-semibold ring-4 ring-surface",
                  st.done ? "bg-good text-[#04140c]" : st.active && (st.n === 1 || st.n === 2) ? "bg-brand text-brand-foreground" : "bg-surface-3 text-ink-3")}>
                  {st.done ? <Check className="size-4" /> : st.n}
                </span>
                <p className={cn("mt-1.5 font-medium", st.active || st.done ? "text-ink" : "text-ink-3")}>{st.label}</p>
                <p className="text-ink-3 tabular">{st.detail}</p>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-col items-center gap-4 text-center">
            <p className="font-mono text-5xl font-semibold tabular tracking-tight" suppressHydrationWarning>{open ? elapsed : "--:--:--"}</p>
            <Button size="xl" variant={open ? "danger" : "primary"} loading={pending && !selfieOpen} onClick={clock} className="h-16 w-full max-w-sm text-lg">
              {open ? <><LogOut /> Bater saída</> : <><LogIn /> Bater entrada</>}
            </Button>
            <p className="max-w-sm text-sm text-ink-3">
              {open
                ? "Quando terminar o turno, toque em “Bater saída”. As horas são somadas automaticamente."
                : requireSelfie ? "Toque no botão, tire a selfie e confirme. Pronto: a entrada fica registrada com o horário." : "Toque no botão para registrar a entrada com o horário de agora."}
            </p>
            <div className="grid w-full max-w-sm grid-cols-2 gap-3 text-left">
              <div className="rounded-lg bg-surface-2 p-3"><p className="text-xs text-ink-3">Trabalhado hoje</p><p className="text-lg font-semibold tabular" suppressHydrationWarning>{formatDuration(todayMin)}</p></div>
              <div className="rounded-lg bg-surface-2 p-3"><p className="text-xs text-ink-3">Nesta semana</p><p className="text-lg font-semibold tabular" suppressHydrationWarning>{formatDuration(weekMin)}</p></div>
            </div>
          </div>
        </Card>
        <Dialog open={selfieOpen} onOpenChange={(o) => !pending && setSelfieOpen(o)}>
          {selfieOpen && <SelfieCapture kind={open ? "out" : "in"} busy={pending} onConfirm={(b) => register(b)} onCancel={() => setSelfieOpen(false)} />}
        </Dialog>

        {/* Recent punches */}
        <Card>
          <CardHeader title="Meus registros de ponto" description="Esqueceu de bater? Peça para o gerente corrigir." />
          <ul className="divide-y divide-line px-4 pb-2 pt-2">
            {entries.length ? entries.slice(0, 8).map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2.5 text-sm">
                <Clock className="size-4 text-ink-3" />
                <span className="flex-1">{new Intl.DateTimeFormat(locale, { weekday: "short", day: "2-digit", month: "2-digit", timeZone: timezone }).format(new Date(e.clock_in))}</span>
                {(e.clock_in_photo || e.clock_out_photo) && <Camera className="size-3.5 text-ink-3" aria-label="Com selfie" />}
                <span className="tabular text-ink-2">{formatTime(e.clock_in, locale, timezone)} – {e.clock_out ? formatTime(e.clock_out, locale, timezone) : <span className="text-good">agora</span>}</span>
                <span className="w-16 text-right font-medium tabular" suppressHydrationWarning>{formatDuration(minutesBetween(e.clock_in, e.clock_out, now))}</span>
              </li>
            )) : <li className="py-8 text-center text-sm text-ink-3">Nenhum registro ainda. Toque em “Bater entrada” quando começar.</li>}
          </ul>
        </Card>
      </div>

      {showSales && (
        <>
          <h2 className="mb-3 mt-8 text-lg font-semibold">Meu dia</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { icon: ShoppingBag, label: "Pedidos que lancei", value: String(n(today?.orders)), sub: `${n(week?.orders)} na semana` },
              { icon: UtensilsCrossed, label: "Mesas atendidas", value: String(n(today?.tables)), sub: `${n(week?.tables)} na semana` },
              { icon: Receipt, label: "Vendido por mim", value: money(today?.revenue), sub: `${money(week?.revenue)} na semana` },
              { icon: ClipboardList, label: "Comandas que fechei", value: String(n(today?.tabs_closed)), sub: `${n(week?.tabs_closed)} na semana` },
            ].map((k) => (
              <Card key={k.label} className="p-4">
                <p className="flex items-center gap-1.5 text-[13px] text-ink-3"><k.icon className="size-3.5" /> {k.label}</p>
                <p className="mt-2 text-2xl font-semibold tabular">{k.value}</p>
                <p className="text-xs text-ink-3">{k.sub}</p>
              </Card>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Minhas comandas abertas" action={<Link href="/comandas" className="text-xs font-medium text-ink-3 hover:text-ink">Ver todas</Link>} />
              <ul className="px-4 pb-3 pt-2">
                {myTabs.length ? myTabs.map((t) => (
                  <li key={t.id} className="flex items-center justify-between border-t border-line py-2.5 text-sm first:border-0">
                    <span><span className="font-medium">{t.label}</span> <span className="text-ink-3">#{t.number}</span></span>
                    <span className="flex items-center gap-1 text-xs text-ink-3"><Timer className="size-3.5" /> <RelativeTime date={t.opened_at} /></span>
                  </li>
                )) : <li className="py-6 text-center text-sm text-ink-3">Nenhuma comanda aberta por você.</li>}
              </ul>
            </Card>
            <Card>
              <CardHeader title="Pedidos que lancei hoje" />
              <ul className="px-4 pb-3 pt-2">
                {myOrders.length ? myOrders.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 border-t border-line py-2.5 text-sm first:border-0">
                    <span className="w-14 font-semibold tabular">#{o.number}</span>
                    <span className="flex-1 truncate text-ink-2">{o.table_label ?? "Sem mesa"} · {formatTime(o.created_at, locale, timezone)}</span>
                    <Badge tone={STATUS_META[o.status as OrderStatus].tone}>{STATUS_META[o.status as OrderStatus].label}</Badge>
                    <span className="w-20 text-right tabular">{money(o.total)}</span>
                  </li>
                )) : <li className="py-6 text-center text-sm text-ink-3">Nenhum pedido lançado por você hoje.</li>}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
