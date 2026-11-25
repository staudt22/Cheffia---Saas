"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Minus, Plus, ShoppingBag, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { createOrderAction } from "@/app/(app)/orders/actions";
import { PAYMENT_METHODS } from "@/lib/validation";
import { cn, formatMoney } from "@/lib/utils";
import type { MenuCategory, MenuItem } from "@/lib/types";

interface Line { key: string; item: MenuItem; quantity: number; modifiers: string; notes: string }

export function NewOrderButton(props: { menu: MenuItem[]; categories: MenuCategory[]; currency: string; locale: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(Boolean(props.defaultOpen));
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}><Plus /> New order</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        {open && <NewOrderForm {...props} onDone={() => setOpen(false)} />}
      </Dialog>
    </>
  );
}

function NewOrderForm({ menu, categories, currency, locale, onDone }: { menu: MenuItem[]; categories: MenuCategory[]; currency: string; locale: string; onDone: () => void }) {
  const [cat, setCat] = useState<string>("all");
  const [lines, setLines] = useState<Line[]>([]);
  const [fulfillment, setFulfillment] = useState<"dine_in" | "takeaway" | "delivery">("dine_in");
  const [details, setDetails] = useState({ customer_name: "", customer_phone: "", table_label: "", notes: "", discount: "", delivery_fee: "", payment_method: "card" });
  const [status, setStatus] = useState<"new" | "completed">("new");
  const [pending, start] = useTransition();
  const money = (v: number) => formatMoney(v, currency, locale);

  const shown = useMemo(() => (cat === "all" ? menu : menu.filter((m) => m.category_id === cat)), [menu, cat]);
  const subtotal = lines.reduce((s, l) => s + l.item.price * l.quantity, 0);
  const discount = Math.min(Number(details.discount || 0), subtotal);
  const fee = fulfillment === "delivery" ? Number(details.delivery_fee || 0) : 0;
  const total = Math.max(subtotal - discount + fee, 0);

  function add(item: MenuItem) {
    setLines((ls) => {
      const existing = ls.find((l) => l.item.id === item.id && !l.modifiers && !l.notes);
      if (existing) return ls.map((l) => (l === existing ? { ...l, quantity: Math.min(l.quantity + 1, 99) } : l));
      return [...ls, { key: `${item.id}-${Date.now()}`, item, quantity: 1, modifiers: "", notes: "" }];
    });
  }
  const patch = (key: string, p: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));

  function submit() {
    start(async () => {
      const r = await createOrderAction({
        items: lines.map((l) => ({ menu_item_id: l.item.id, quantity: l.quantity, modifiers: l.modifiers, notes: l.notes })),
        fulfillment,
        ...details,
        discount: discount,
        delivery_fee: fee,
        status,
      });
      if (!r.ok) return void toast.error(r.error);
      toast.success(status === "completed" ? "Order recorded as completed" : "Order sent to the kitchen");
      onDone();
    });
  }

  if (!menu.length) {
    return (
      <DialogContent title="New order" size="sm">
        <EmptyState icon={<UtensilsCrossed />} title="Your menu is empty" description="Add menu items first so orders use the right prices." action={<Button asChild variant="primary"><Link href="/menu">Go to menu</Link></Button>} />
      </DialogContent>
    );
  }

  return (
    <DialogContent title="New order" description="Prices come from your menu." size="lg" className="max-w-5xl"
      footer={<div className="flex w-full flex-wrap items-center gap-3">
        <Segmented ariaLabel="Initial status" size="md" value={status} onChange={setStatus} options={[{ value: "new", label: "Send to kitchen" }, { value: "completed", label: "Already served & paid" }]} />
        <span className="ml-auto text-sm text-ink-2">Total <strong className="text-ink tabular">{money(total)}</strong></span>
        <Button variant="primary" loading={pending} disabled={!lines.length} onClick={submit}>{status === "completed" ? "Record order" : "Create order"}</Button>
      </div>}>
      <div className="grid gap-5 md:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="mb-3 flex gap-1 overflow-x-auto pb-1">
            {[{ id: "all", name: "All" }, ...categories].map((c) => (
              <button key={c.id} onClick={() => setCat(c.id)} className={cn("whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition", cat === c.id ? "bg-brand text-brand-foreground" : "bg-surface-3 text-ink-2 hover:text-ink")}>{c.name}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {shown.map((m) => {
              const inCart = lines.filter((l) => l.item.id === m.id).reduce((s, l) => s + l.quantity, 0);
              return (
                <button key={m.id} onClick={() => add(m)} className={cn("relative flex min-h-20 flex-col justify-between rounded-lg p-3 text-left ring-1 ring-line transition hover:bg-surface-2 hover:ring-line-strong active:scale-[0.98]", inCart && "ring-2 ring-brand")}>
                  <span className="line-clamp-2 text-sm font-medium leading-5">{m.name}</span>
                  <span className="mt-1 text-xs text-ink-3 tabular">{money(m.price)}</span>
                  {inCart > 0 && <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-brand-foreground">{inCart}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-lg bg-surface-2 p-3">
            <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-3"><ShoppingBag className="size-3.5" /> Items</p>
            {lines.length ? (
              <ul className="flex flex-col gap-2">
                {lines.map((l) => (
                  <li key={l.key} className="rounded-md bg-surface p-2 shadow-card">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{l.item.name}</span>
                      <div className="flex items-center rounded-md ring-1 ring-line">
                        <button className="p-1.5 text-ink-2 hover:text-ink" onClick={() => (l.quantity > 1 ? patch(l.key, { quantity: l.quantity - 1 }) : setLines(lines.filter((x) => x.key !== l.key)))} aria-label="Decrease">{l.quantity > 1 ? <Minus className="size-3.5" /> : <Trash2 className="size-3.5" />}</button>
                        <span className="w-6 text-center text-sm tabular">{l.quantity}</span>
                        <button className="p-1.5 text-ink-2 hover:text-ink" onClick={() => patch(l.key, { quantity: Math.min(l.quantity + 1, 99) })} aria-label="Increase"><Plus className="size-3.5" /></button>
                      </div>
                      <span className="w-16 text-right text-sm tabular">{money(l.item.price * l.quantity)}</span>
                    </div>
                    <Input className="mt-2 h-8 text-xs" placeholder="Modifications (e.g. no onion, well done)" value={l.modifiers} onChange={(e) => patch(l.key, { modifiers: e.target.value })} aria-label={`Modifications for ${l.item.name}`} />
                  </li>
                ))}
              </ul>
            ) : <p className="py-4 text-center text-sm text-ink-3">Tap menu items to add them.</p>}
          </div>
          <Segmented ariaLabel="Fulfillment" size="md" value={fulfillment} onChange={setFulfillment} options={[{ value: "dine_in", label: "Dine-in" }, { value: "takeaway", label: "Takeaway" }, { value: "delivery", label: "Delivery" }]} />
          <div className="grid grid-cols-2 gap-3">
            {fulfillment === "dine_in" ? (
              <Field label="Table" htmlFor="o-table"><Input id="o-table" value={details.table_label} onChange={(e) => setDetails({ ...details, table_label: e.target.value })} placeholder="e.g. 12" /></Field>
            ) : (
              <Field label="Phone" htmlFor="o-phone"><Input id="o-phone" value={details.customer_phone} onChange={(e) => setDetails({ ...details, customer_phone: e.target.value })} /></Field>
            )}
            <Field label="Customer name" htmlFor="o-name"><Input id="o-name" value={details.customer_name} onChange={(e) => setDetails({ ...details, customer_name: e.target.value })} /></Field>
            <Field label="Discount" htmlFor="o-discount"><Input id="o-discount" type="number" min={0} step="0.01" value={details.discount} onChange={(e) => setDetails({ ...details, discount: e.target.value })} placeholder="0.00" /></Field>
            {fulfillment === "delivery" ? (
              <Field label="Delivery fee" htmlFor="o-fee"><Input id="o-fee" type="number" min={0} step="0.01" value={details.delivery_fee} onChange={(e) => setDetails({ ...details, delivery_fee: e.target.value })} placeholder="0.00" /></Field>
            ) : (
              <Field label="Payment" htmlFor="o-pay">
                <Select id="o-pay" value={details.payment_method} onChange={(e) => setDetails({ ...details, payment_method: e.target.value })}>
                  {PAYMENT_METHODS.filter((p) => p.value !== "platform_payout").map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </Select>
              </Field>
            )}
          </div>
          <Field label="Kitchen notes" htmlFor="o-notes"><Textarea id="o-notes" rows={2} className="min-h-0" value={details.notes} onChange={(e) => setDetails({ ...details, notes: e.target.value })} placeholder="Allergies, timing…" /></Field>
          <dl className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between text-ink-2"><dt>Subtotal</dt><dd className="tabular">{money(subtotal)}</dd></div>
            {discount > 0 && <div className="flex justify-between text-ink-2"><dt>Discount</dt><dd className="tabular">−{money(discount)}</dd></div>}
            {fee > 0 && <div className="flex justify-between text-ink-2"><dt>Delivery</dt><dd className="tabular">{money(fee)}</dd></div>}
          </dl>
        </div>
      </div>
    </DialogContent>
  );
}
