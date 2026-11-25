"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { ClipboardCheck, PackageMinus, PackagePlus, Pencil, Trash, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, SheetContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { MOVEMENT_LABEL, StatusBadge, type MovementRow, type stockStatus } from "@/components/inventory/inventory-view";
import { deleteInventoryItemAction, recordMovementAction, saveInventoryItemAction } from "@/app/(app)/inventory/actions";
import { UNITS, UNIT_LABELS } from "@/lib/validation";
import { cn, formatMoney, formatNumber, formatQuantity } from "@/lib/utils";
import type { InventoryItem, Supplier } from "@/lib/types";

type MoveType = "purchase" | "usage" | "waste" | "adjustment";

export function ItemSheet({ item, movements, status, suppliers, currency, locale, canEdit, onEdit, onDeleted }: {
  item: InventoryItem; movements: MovementRow[]; status: ReturnType<typeof stockStatus>; suppliers: Supplier[];
  currency: string; locale: string; canEdit: boolean; onEdit: () => void; onDeleted: () => void;
}) {
  const [move, setMove] = useState<MoveType | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();
  const supplier = suppliers.find((s) => s.id === item.supplier_id);
  const money = (v: number) => formatMoney(v, currency, locale);

  return (
    <>
      <SheetContent title={item.name} description={`${item.category}${item.storage_location ? ` · ${item.storage_location}` : ""}`}
        footer={canEdit ? <div className="flex w-full gap-2">
          <Button variant="danger-ghost" onClick={() => setConfirmDelete(true)}><Trash2 /> Delete</Button>
          <Button className="ml-auto" onClick={onEdit}><Pencil /> Edit</Button>
        </div> : undefined}>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-ink-3">In stock</p>
            <p className="text-3xl font-semibold tabular">{formatQuantity(item.quantity, item.unit, locale)}</p>
          </div>
          <StatusBadge status={status} expires={item.expires_on} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-surface-2 p-3 text-sm">
          <div><dt className="text-xs text-ink-3">Minimum</dt><dd className="tabular">{formatQuantity(item.min_quantity, item.unit, locale)}</dd></div>
          <div><dt className="text-xs text-ink-3">Cost per {item.unit}</dt><dd className="tabular">{money(Number(item.unit_cost))}</dd></div>
          <div><dt className="text-xs text-ink-3">Supplier</dt><dd>{supplier?.name ?? "—"}</dd></div>
          <div><dt className="text-xs text-ink-3">Expires</dt><dd>{item.expires_on ?? "—"}</dd></div>
        </dl>
        {item.notes && <p className="mt-3 text-sm text-ink-2">{item.notes}</p>}
        {canEdit && (
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button onClick={() => setMove("purchase")}><PackagePlus /> Purchase</Button>
            <Button onClick={() => setMove("usage")}><PackageMinus /> Usage</Button>
            <Button onClick={() => setMove("waste")}><Trash /> Waste</Button>
            <Button onClick={() => setMove("adjustment")}><ClipboardCheck /> Stock count</Button>
          </div>
        )}
        <p className="mb-2 mt-6 text-xs font-medium uppercase tracking-wide text-ink-3">History</p>
        {movements.length ? (
          <ul className="divide-y divide-line">
            {movements.slice(0, 30).map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="min-w-0 flex-1"><span className="block">{MOVEMENT_LABEL[m.type] ?? m.type}</span><span className="block truncate text-xs text-ink-3">{m.reason ?? ""}</span></span>
                <span className="text-xs text-ink-3">{formatDistanceToNowStrict(new Date(m.created_at), { addSuffix: true })}</span>
                <span className={cn("w-20 text-right font-medium tabular", m.quantity_delta > 0 ? "text-good" : "")}>{m.quantity_delta > 0 ? "+" : ""}{formatNumber(m.quantity_delta, locale, 3)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink-3">No movements yet.</p>}
      </SheetContent>

      <Dialog open={!!move} onOpenChange={(o) => !o && setMove(null)}>
        {move && <MovementDialog item={item} type={move} setType={setMove} currency={currency} locale={locale} onDone={() => setMove(null)} />}
      </Dialog>
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent size="sm" title={`Delete ${item.name}?`} description="Its movement history is deleted too. Items used in recipes can't be deleted."
          footer={<><Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button><Button variant="danger" loading={pending} onClick={() => start(async () => {
            const r = await deleteInventoryItemAction(item.id);
            if (!r.ok) return void toast.error(r.error);
            toast.success("Item deleted"); setConfirmDelete(false); onDeleted();
          })}>Delete</Button></>}><span /></DialogContent>
      </Dialog>
    </>
  );
}

function MovementDialog({ item, type, setType, currency, locale, onDone }: { item: InventoryItem; type: MoveType; setType: (t: MoveType) => void; currency: string; locale: string; onDone: () => void }) {
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState(String(item.unit_cost ?? ""));
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const current = Number(item.quantity);
  const n = Number(qty);
  const after = qty === "" ? null : type === "purchase" ? current + n : type === "adjustment" ? n : current - n;

  function submit() {
    const payload = type === "adjustment" ? { type, counted: qty, reason } : type === "purchase" ? { type, quantity: qty, unit_cost: cost || undefined, reason } : { type, quantity: qty, reason };
    start(async () => {
      const r = await recordMovementAction(item.id, payload);
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message ?? "Stock updated");
      onDone();
    });
  }

  return (
    <DialogContent size="sm" title={`Update ${item.name}`} description={`Currently ${formatQuantity(current, item.unit, locale)}`}
      footer={<><Button variant="ghost" onClick={onDone}>Cancel</Button><Button variant="primary" loading={pending} disabled={qty === "" || n < 0 || (type !== "adjustment" && n <= 0) || (type === "waste" && !reason.trim())} onClick={submit}>Save</Button></>}>
      <div className="flex flex-col gap-4">
        <Segmented size="md" ariaLabel="Movement type" value={type} onChange={(t) => { setType(t); setQty(""); }} options={[
          { value: "purchase", label: "Purchase" }, { value: "usage", label: "Usage" }, { value: "waste", label: "Waste" }, { value: "adjustment", label: "Count" },
        ]} />
        <Field label={type === "adjustment" ? `Counted quantity (${item.unit})` : `Quantity (${item.unit})`} htmlFor="mv-qty"
          hint={after != null ? `After this: ${formatQuantity(after, item.unit, locale)}` : undefined}>
          <Input id="mv-qty" type="number" min={0} step="any" autoFocus value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
        {type === "purchase" && (
          <Field label={`Cost per ${item.unit} (${currency})`} htmlFor="mv-cost" hint="Updates the item's cost so recipe costs stay accurate.">
            <Input id="mv-cost" type="number" min={0} step="0.0001" value={cost} onChange={(e) => setCost(e.target.value)} />
          </Field>
        )}
        <Field label={type === "waste" ? "Reason" : "Note (optional)"} htmlFor="mv-reason">
          <Input id="mv-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={type === "waste" ? "e.g. expired, dropped" : ""} />
        </Field>
        {after != null && after < 0 && <p className="text-xs text-warn">This would make the stock negative.</p>}
      </div>
    </DialogContent>
  );
}

export function InventoryItemDialog({ item, suppliers, categories, currency, onDone }: { item: InventoryItem | null; suppliers: Supplier[]; categories: string[]; currency: string; onDone: () => void }) {
  const [v, setV] = useState({
    name: item?.name ?? "", category: item?.category ?? categories[0] ?? "General", unit: item?.unit ?? "kg",
    min_quantity: item ? String(item.min_quantity) : "", unit_cost: item ? String(item.unit_cost) : "",
    supplier_id: item?.supplier_id ?? "", expires_on: item?.expires_on ?? "", storage_location: item?.storage_location ?? "", notes: item?.notes ?? "",
  });
  const [initial, setInitial] = useState("");
  const [pending, start] = useTransition();
  const set = (p: Partial<typeof v>) => setV({ ...v, ...p });

  return (
    <DialogContent title={item ? `Edit ${item.name}` : "Add inventory item"}
      footer={<><Button variant="ghost" onClick={onDone}>Cancel</Button><Button variant="primary" loading={pending} disabled={!v.name.trim()} onClick={() => start(async () => {
        const r = await saveInventoryItemAction(item?.id ?? null, { ...v, min_quantity: v.min_quantity || 0, unit_cost: v.unit_cost || 0, supplier_id: v.supplier_id || null, expires_on: v.expires_on || null }, initial ? Number(initial) : undefined);
        if (!r.ok) return void toast.error(r.error);
        toast.success(item ? "Item updated" : "Item added");
        onDone();
      })}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="ii-name" className="sm:col-span-2"><Input id="ii-name" autoFocus value={v.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Category" htmlFor="ii-cat">
          <Input id="ii-cat" list="ii-cats" value={v.category} onChange={(e) => set({ category: e.target.value })} />
          <datalist id="ii-cats">{[...new Set([...categories, "Meat", "Produce", "Dairy", "Bakery", "Beverages", "Pantry", "Packaging", "Cleaning"])].map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Unit" htmlFor="ii-unit" hint={item ? "Changing the unit doesn't convert existing quantities." : undefined}>
          <Select id="ii-unit" value={v.unit} onChange={(e) => set({ unit: e.target.value as typeof v.unit })}>
            {UNITS.map((u) => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
          </Select>
        </Field>
        {!item && <Field label={`Current stock (${v.unit})`} htmlFor="ii-qty"><Input id="ii-qty" type="number" min={0} step="any" value={initial} onChange={(e) => setInitial(e.target.value)} placeholder="0" /></Field>}
        <Field label={`Minimum stock (${v.unit})`} htmlFor="ii-min" hint="You'll get an alert below this level."><Input id="ii-min" type="number" min={0} step="any" value={v.min_quantity} onChange={(e) => set({ min_quantity: e.target.value })} placeholder="0" /></Field>
        <Field label={`Cost per ${v.unit} (${currency})`} htmlFor="ii-cost"><Input id="ii-cost" type="number" min={0} step="0.0001" value={v.unit_cost} onChange={(e) => set({ unit_cost: e.target.value })} placeholder="0.00" /></Field>
        <Field label="Supplier" htmlFor="ii-sup">
          <Select id="ii-sup" value={v.supplier_id} onChange={(e) => set({ supplier_id: e.target.value })} disabled={!suppliers.length}>
            <option value="">{suppliers.length ? "None" : "No suppliers yet"}</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Expiration date" htmlFor="ii-exp"><Input id="ii-exp" type="date" value={v.expires_on} onChange={(e) => set({ expires_on: e.target.value })} /></Field>
        <Field label="Storage location" htmlFor="ii-loc"><Input id="ii-loc" value={v.storage_location} onChange={(e) => set({ storage_location: e.target.value })} placeholder="e.g. Walk-in fridge" /></Field>
        <Field label="Notes" htmlFor="ii-notes" className="sm:col-span-2"><Textarea id="ii-notes" rows={2} value={v.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
      </div>
    </DialogContent>
  );
}
