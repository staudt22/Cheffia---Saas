"use client";

import { useState, useTransition } from "react";
import { Ban, Clock, MessageSquareText, Phone, User } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, SheetContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SourceBadge } from "@/components/orders/source-badge";
import { updateOrderStatusAction } from "@/app/(app)/orders/actions";
import { FULFILLMENT_LABEL, STATUS_META } from "@/lib/orders";
import { formatTime } from "@/lib/dates";
import { formatMoney } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/lib/validation";
import type { Order, OrderStatus } from "@/lib/types";

export function OrderDetailSheet({
  order, onOpenChange, currency, locale, timezone, canEdit,
}: { order: Order | null; onOpenChange: (o: boolean) => void; currency: string; locale: string; timezone: string; canEdit: boolean }) {
  const [pending, start] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const money = (v: number) => formatMoney(v, currency, locale);

  function setStatus(status: OrderStatus) {
    if (!order) return;
    start(async () => {
      const r = await updateOrderStatusAction(order.id, status);
      if (!r.ok) return void toast.error(r.error);
      toast.success(`Pedido #${order.number}: ${STATUS_META[status].label.toLowerCase()}`);
      setConfirmCancel(false);
    });
  }

  const meta = order ? STATUS_META[order.status] : null;
  const timeline = order ? ([
    ["Recebido", order.created_at], ["Aceito", order.accepted_at], ["Pronto", order.ready_at], ["Concluído", order.completed_at], ["Cancelado", order.cancelled_at],
  ] as const).filter(([, t]) => t) : [];

  return (
    <Dialog open={!!order} onOpenChange={onOpenChange}>
      {order && meta && (
        <SheetContent
          title={<span className="flex items-center gap-2">Pedido #{order.number} <Badge tone={meta.tone}>{meta.label}</Badge></span>}
          description={<span className="flex items-center gap-2"><SourceBadge source={order.source} simulated={order.is_simulated} /> · {FULFILLMENT_LABEL[order.fulfillment]}{order.table_label ? ` · ${order.table_label}` : ""}</span>}
          footer={canEdit && order.status !== "cancelled" ? (
            <div className="flex w-full items-center gap-2">
              <Button variant="danger-ghost" onClick={() => setConfirmCancel(true)} disabled={pending}><Ban /> Cancelar pedido</Button>
              {meta.next && <Button className="ml-auto" variant="primary" loading={pending} onClick={() => setStatus(meta.next!)}>{meta.action}</Button>}
            </div>
          ) : undefined}
        >
          {order.is_simulated && (
            <p className="mb-4 rounded-md bg-accent-soft px-3 py-2 text-xs text-accent">Este é um pedido simulado, criado no modo demonstração. Ele não veio de uma plataforma conectada de verdade.</p>
          )}
          {(order.customer_name || order.customer_phone) && (
            <div className="mb-4 flex flex-col gap-1.5 text-sm">
              {order.customer_name && <p className="flex items-center gap-2"><User className="size-4 text-ink-3" /> {order.customer_name}</p>}
              {order.customer_phone && <p className="flex items-center gap-2"><Phone className="size-4 text-ink-3" /> {order.customer_phone}</p>}
            </div>
          )}
          <ul className="divide-y divide-line rounded-lg ring-1 ring-line">
            {(order.order_items ?? []).map((i) => (
              <li key={i.id} className="flex gap-3 px-3 py-2.5">
                <span className="w-7 font-semibold tabular">{i.quantity}×</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{i.name}</p>
                  {i.modifiers && <p className="text-xs text-accent">{i.modifiers}</p>}
                  {i.notes && <p className="text-xs text-ink-3">{i.notes}</p>}
                </div>
                <span className="text-sm tabular">{money(i.total)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between text-ink-2"><dt>Subtotal</dt><dd className="tabular">{money(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between text-ink-2"><dt>Desconto</dt><dd className="tabular">−{money(order.discount)}</dd></div>}
            {order.delivery_fee > 0 && <div className="flex justify-between text-ink-2"><dt>Taxa de entrega</dt><dd className="tabular">{money(order.delivery_fee)}</dd></div>}
            <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>Total</dt><dd className="tabular">{money(order.total)}</dd></div>
            {order.payment_method && <div className="flex justify-between text-xs text-ink-3"><dt>Pagamento</dt><dd>{PAYMENT_METHODS.find((p) => p.value === order.payment_method)?.label ?? order.payment_method}</dd></div>}
          </dl>
          {order.notes && (
            <div className="mt-4 flex gap-2 rounded-md bg-warn-soft px-3 py-2 text-sm text-warn"><MessageSquareText className="mt-0.5 size-4 shrink-0" />{order.notes}</div>
          )}
          <div className="mt-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-3">Linha do tempo</p>
            <ol className="flex flex-col gap-2">
              {timeline.map(([label, t]) => (
                <li key={label} className="flex items-center gap-2 text-sm"><Clock className="size-3.5 text-ink-3" /><span className="flex-1">{label}</span><span className="text-ink-2 tabular">{formatTime(t!, locale, timezone)}</span></li>
              ))}
            </ol>
            {order.estimated_prep_minutes && order.status !== "completed" && order.status !== "cancelled" && (
              <p className="mt-2 text-xs text-ink-3">Tempo estimado de preparo: {order.estimated_prep_minutes} min</p>
            )}
          </div>
        </SheetContent>
      )}
      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent size="sm" title={`Cancelar o pedido #${order?.number}?`}
          description={order?.status === "completed" ? "O valor sai do faturamento e os ingredientes usados voltam para o estoque." : "A cozinha vai parar de preparar. Não dá para desfazer."}
          footer={<><Button variant="ghost" onClick={() => setConfirmCancel(false)}>Manter pedido</Button><Button variant="danger" loading={pending} onClick={() => setStatus("cancelled")}>Cancelar pedido</Button></>}>
          <p className="text-sm text-ink-2">Pedidos cancelados continuam no histórico para os relatórios.</p>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
