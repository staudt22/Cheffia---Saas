"use client";

import { RelativeTime } from "@/components/ui/relative-time";
import { useState, useTransition } from "react";
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
          <Button variant="danger-ghost" onClick={() => setConfirmDelete(true)}><Trash2 /> Excluir</Button>
          <Button className="ml-auto" onClick={onEdit}><Pencil /> Editar</Button>
        </div> : undefined}>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-ink-3">Tem hoje</p>
            <p className="text-3xl font-semibold tabular">{formatQuantity(item.quantity, item.unit, locale)}</p>
          </div>
          <StatusBadge status={status} expires={item.expires_on} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-surface-2 p-3 text-sm">
          <div><dt className="text-xs text-ink-3">Mínimo</dt><dd className="tabular">{formatQuantity(item.min_quantity, item.unit, locale)}</dd></div>
          <div><dt className="text-xs text-ink-3">Custo por {item.unit}</dt><dd className="tabular">{money(Number(item.unit_cost))}</dd></div>
          <div><dt className="text-xs text-ink-3">Fornecedor</dt><dd>{supplier?.name ?? "—"}</dd></div>
          <div><dt className="text-xs text-ink-3">Validade</dt><dd>{item.expires_on?.split("-").reverse().join("/") ?? "—"}</dd></div>
        </dl>
        {item.notes && <p className="mt-3 text-sm text-ink-2">{item.notes}</p>}
        {canEdit && (
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button onClick={() => setMove("purchase")}><PackagePlus /> Entrada (compra)</Button>
            <Button onClick={() => setMove("usage")}><PackageMinus /> Saída (uso)</Button>
            <Button onClick={() => setMove("waste")}><Trash /> Desperdício</Button>
            <Button onClick={() => setMove("adjustment")}><ClipboardCheck /> Contagem</Button>
          </div>
        )}
        <p className="mb-2 mt-6 text-xs font-medium uppercase tracking-wide text-ink-3">Histórico</p>
        {movements.length ? (
          <ul className="divide-y divide-line">
            {movements.slice(0, 30).map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="min-w-0 flex-1"><span className="block">{MOVEMENT_LABEL[m.type] ?? m.type}</span><span className="block truncate text-xs text-ink-3">{m.reason ?? ""}</span></span>
                <span className="text-xs text-ink-3"><RelativeTime date={m.created_at} suffix /></span>
                <span className={cn("w-20 text-right font-medium tabular", m.quantity_delta > 0 ? "text-good" : "")}>{m.quantity_delta > 0 ? "+" : ""}{formatNumber(m.quantity_delta, locale, 3)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink-3">Nenhuma movimentação ainda.</p>}
      </SheetContent>

      <Dialog open={!!move} onOpenChange={(o) => !o && setMove(null)}>
        {move && <MovementDialog item={item} type={move} setType={setMove} currency={currency} locale={locale} onDone={() => setMove(null)} />}
      </Dialog>
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent size="sm" title={`Excluir ${item.name}?`} description="O histórico de movimentações também será apagado. Itens usados em fichas técnicas não podem ser excluídos."
          footer={<><Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</Button><Button variant="danger" loading={pending} onClick={() => start(async () => {
            const r = await deleteInventoryItemAction(item.id);
            if (!r.ok) return void toast.error(r.error);
            toast.success("Item excluído"); setConfirmDelete(false); onDeleted();
          })}>Excluir</Button></>}><span /></DialogContent>
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
      toast.success(r.message ?? "Estoque atualizado");
      onDone();
    });
  }

  return (
    <DialogContent size="sm" title={`Movimentar ${item.name}`} description={`Hoje tem ${formatQuantity(current, item.unit, locale)}`}
      footer={<><Button variant="ghost" onClick={onDone}>Cancelar</Button><Button variant="primary" loading={pending} disabled={qty === "" || n < 0 || (type !== "adjustment" && n <= 0) || (type === "waste" && !reason.trim())} onClick={submit}>Salvar</Button></>}>
      <div className="flex flex-col gap-4">
        <Segmented size="md" ariaLabel="Tipo de movimentação" value={type} onChange={(t) => { setType(t); setQty(""); }} options={[
          { value: "purchase", label: "Compra" }, { value: "usage", label: "Uso" }, { value: "waste", label: "Desperdício" }, { value: "adjustment", label: "Contagem" },
        ]} />
        <Field label={type === "adjustment" ? `Quantidade contada (${item.unit})` : `Quantidade (${item.unit})`} htmlFor="mv-qty"
          hint={after != null ? `Depois disso: ${formatQuantity(after, item.unit, locale)}` : type === "adjustment" ? "Conte o que tem na prateleira e digite aqui. O CheffeData calcula a diferença." : undefined}>
          <Input id="mv-qty" type="number" min={0} step="any" autoFocus value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
        {type === "purchase" && (
          <Field label={`Custo por ${item.unit} (R$)`} htmlFor="mv-cost" hint="Atualiza o custo do item, para as fichas técnicas ficarem certas.">
            <Input id="mv-cost" type="number" min={0} step="0.0001" value={cost} onChange={(e) => setCost(e.target.value)} />
          </Field>
        )}
        <Field label={type === "waste" ? "Motivo" : "Observação (opcional)"} htmlFor="mv-reason">
          <Input id="mv-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={type === "waste" ? "ex.: venceu, caiu no chão" : ""} />
        </Field>
        {after != null && after < 0 && <p className="text-xs text-warn">Assim o estoque ficaria negativo.</p>}
      </div>
    </DialogContent>
  );
}

export function InventoryItemDialog({ item, suppliers, categories, currency, onDone }: { item: InventoryItem | null; suppliers: Supplier[]; categories: string[]; currency: string; onDone: () => void }) {
  const [v, setV] = useState({
    name: item?.name ?? "", category: item?.category ?? categories[0] ?? "Geral", unit: item?.unit ?? "kg",
    min_quantity: item ? String(item.min_quantity) : "", unit_cost: item ? String(item.unit_cost) : "",
    supplier_id: item?.supplier_id ?? "", expires_on: item?.expires_on ?? "", storage_location: item?.storage_location ?? "", notes: item?.notes ?? "",
  });
  const [initial, setInitial] = useState("");
  const [pending, start] = useTransition();
  const set = (p: Partial<typeof v>) => setV({ ...v, ...p });

  return (
    <DialogContent title={item ? `Editar ${item.name}` : "Novo item no estoque"}
      footer={<><Button variant="ghost" onClick={onDone}>Cancelar</Button><Button variant="primary" loading={pending} disabled={!v.name.trim()} onClick={() => start(async () => {
        const r = await saveInventoryItemAction(item?.id ?? null, { ...v, min_quantity: v.min_quantity || 0, unit_cost: v.unit_cost || 0, supplier_id: v.supplier_id || null, expires_on: v.expires_on || null }, initial ? Number(initial) : undefined);
        if (!r.ok) return void toast.error(r.error);
        toast.success(item ? "Item atualizado" : "Item adicionado");
        onDone();
      })}>Salvar</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nome" htmlFor="ii-name" className="sm:col-span-2"><Input id="ii-name" autoFocus value={v.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Categoria" htmlFor="ii-cat">
          <Input id="ii-cat" list="ii-cats" value={v.category} onChange={(e) => set({ category: e.target.value })} />
          <datalist id="ii-cats">{[...new Set([...categories, "Carnes", "Hortifruti", "Laticínios", "Padaria", "Bebidas", "Mercearia", "Embalagens", "Limpeza"])].map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Unidade" htmlFor="ii-unit" hint={item ? "Trocar a unidade não converte a quantidade que já existe." : undefined}>
          <Select id="ii-unit" value={v.unit} onChange={(e) => set({ unit: e.target.value as typeof v.unit })}>
            {UNITS.map((u) => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
          </Select>
        </Field>
        {!item && <Field label={`Quanto tem hoje (${v.unit})`} htmlFor="ii-qty"><Input id="ii-qty" type="number" min={0} step="any" value={initial} onChange={(e) => setInitial(e.target.value)} placeholder="0" /></Field>}
        <Field label={`Estoque mínimo (${v.unit})`} htmlFor="ii-min" hint="Abaixo disso, você recebe um aviso."><Input id="ii-min" type="number" min={0} step="any" value={v.min_quantity} onChange={(e) => set({ min_quantity: e.target.value })} placeholder="0" /></Field>
        <Field label={`Custo por ${v.unit} (R$)`} htmlFor="ii-cost"><Input id="ii-cost" type="number" min={0} step="0.0001" value={v.unit_cost} onChange={(e) => set({ unit_cost: e.target.value })} placeholder="0.00" /></Field>
        <Field label="Fornecedor" htmlFor="ii-sup">
          <Select id="ii-sup" value={v.supplier_id} onChange={(e) => set({ supplier_id: e.target.value })} disabled={!suppliers.length}>
            <option value="">{suppliers.length ? "Nenhum" : "Nenhum fornecedor ainda"}</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Validade" htmlFor="ii-exp"><Input id="ii-exp" type="date" value={v.expires_on} onChange={(e) => set({ expires_on: e.target.value })} /></Field>
        <Field label="Onde fica guardado" htmlFor="ii-loc"><Input id="ii-loc" value={v.storage_location} onChange={(e) => set({ storage_location: e.target.value })} placeholder="ex.: Câmara fria" /></Field>
        <Field label="Observações" htmlFor="ii-notes" className="sm:col-span-2"><Textarea id="ii-notes" rows={2} value={v.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
      </div>
    </DialogContent>
  );
}
