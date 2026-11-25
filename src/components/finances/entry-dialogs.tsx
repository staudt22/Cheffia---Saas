"use client";

import { useRef, useState, useTransition } from "react";
import { FileUp, Paperclip, ScanText, X } from "lucide-react";
import { toast } from "sonner";
import { DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { saveExpenseAction, saveRevenueAction } from "@/app/(app)/finances/actions";
import { EXPENSE_CATEGORIES, EXPENSE_LABELS, PAYMENT_METHODS } from "@/lib/validation";
import { receiptExtractionAvailable } from "@/lib/receipts/extractor";
import type { Expense, RevenueRecord, Supplier } from "@/lib/types";

const today = () => new Date().toISOString().slice(0, 10);

export function ExpenseDialog({ expense, suppliers, restaurantId, onDone }: { expense: Expense | null; suppliers: Supplier[]; restaurantId: string; currency?: string; onDone: () => void }) {
  const [v, setV] = useState({
    description: expense?.description ?? "", amount: expense ? String(expense.amount) : "", category: expense?.category ?? "ingredients",
    date: expense?.date ?? today(), supplier_id: expense?.supplier_id ?? "", payment_method: expense?.payment_method ?? "pix",
    is_recurring: expense?.is_recurring ?? false, recurrence: expense?.recurrence ?? "monthly", notes: expense?.notes ?? "", receipt_path: expense?.receipt_path ?? null as string | null,
  });
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(expense?.receipt_path ? "Comprovante anexado" : null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const set = (p: Partial<typeof v>) => setV({ ...v, ...p });

  async function upload(f: File) {
    if (!["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(f.type)) return toast.error("Use um arquivo PDF, PNG, JPG ou WebP.");
    if (f.size > 10 * 1024 * 1024) return toast.error("O comprovante precisa ter até 10 MB.");
    setUploading(true);
    const supabase = createClient();
    const path = `${restaurantId}/${crypto.randomUUID()}.${f.name.split(".").pop()?.toLowerCase() ?? "pdf"}`;
    const { error } = await supabase.storage.from("receipts").upload(path, f, { contentType: f.type });
    setUploading(false);
    if (error) return toast.error("Não foi possível enviar. Tente novamente.");
    set({ receipt_path: path });
    setFileName(f.name);
  }

  return (
    <DialogContent title={expense ? "Editar despesa" : "Lançar despesa"}
      footer={<><Button variant="ghost" onClick={onDone}>Cancelar</Button>
        <Button variant="primary" loading={pending} disabled={!v.description.trim() || !v.amount || uploading} onClick={() => start(async () => {
          const r = await saveExpenseAction(expense?.id ?? null, { ...v, supplier_id: v.supplier_id || null, recurrence: v.is_recurring ? v.recurrence : null });
          if (!r.ok) return void toast.error(r.error);
          toast.success(expense ? "Despesa atualizada" : "Despesa lançada");
          onDone();
        })}>Salvar despesa</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Descrição" htmlFor="ex-desc" className="sm:col-span-2"><Input id="ex-desc" autoFocus value={v.description} onChange={(e) => set({ description: e.target.value })} placeholder="ex.: Compra do hortifruti da semana" /></Field>
        <Field label="Valor (R$)" htmlFor="ex-amount"><Input id="ex-amount" type="number" min={0} step="0.01" value={v.amount} onChange={(e) => set({ amount: e.target.value })} /></Field>
        <Field label="Data" htmlFor="ex-date"><Input id="ex-date" type="date" value={v.date} onChange={(e) => set({ date: e.target.value })} /></Field>
        <Field label="Categoria" htmlFor="ex-cat">
          <Select id="ex-cat" value={v.category} onChange={(e) => set({ category: e.target.value as typeof v.category })}>
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{EXPENSE_LABELS[c]}</option>)}
          </Select>
        </Field>
        <Field label="Forma de pagamento" htmlFor="ex-pay">
          <Select id="ex-pay" value={v.payment_method ?? ""} onChange={(e) => set({ payment_method: e.target.value })}>
            {PAYMENT_METHODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
        </Field>
        <Field label="Fornecedor" htmlFor="ex-sup" className="sm:col-span-2">
          <Select id="ex-sup" value={v.supplier_id} onChange={(e) => set({ supplier_id: e.target.value })} disabled={!suppliers.length}>
            <option value="">{suppliers.length ? "Nenhum" : "Nenhum fornecedor ainda"}</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <div className="flex flex-col gap-3 rounded-lg bg-surface-2 p-3 sm:col-span-2">
          <label className="flex items-center justify-between gap-3">
            <span><span className="block text-sm font-medium">É uma conta fixa?</span><span className="block text-xs text-ink-3">Ex.: aluguel, salários, internet. O Forkly lança sozinho a cada período, a partir desta data.</span></span>
            <Switch checked={v.is_recurring} onCheckedChange={(c) => set({ is_recurring: c })} />
          </label>
          {v.is_recurring && (
            <Select value={v.recurrence} onChange={(e) => set({ recurrence: e.target.value as typeof v.recurrence })} aria-label="Repete">
              <option value="weekly">Toda semana</option><option value="monthly">Todo mês</option><option value="yearly">Todo ano</option>
            </Select>
          )}
        </div>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-[13px] font-medium text-ink-2">Comprovante ou nota fiscal</p>
          {v.receipt_path ? (
            <div className="flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2 text-sm">
              <Paperclip className="size-4 text-ink-3" /><span className="flex-1 truncate">{fileName}</span>
              <button className="rounded p-1 text-ink-3 hover:bg-surface-3" onClick={() => { set({ receipt_path: null }); setFileName(null); }} aria-label="Remover comprovante"><X className="size-4" /></button>
            </div>
          ) : (
            <button type="button" onClick={() => input.current?.click()} disabled={uploading}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-line-strong px-3 py-4 text-sm text-ink-3 hover:border-brand hover:text-brand"
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) upload(f); }}>
              <FileUp className="size-4" /> {uploading ? "Enviando…" : "Arraste o arquivo ou clique para enviar (PDF ou foto · até 10 MB)"}
            </button>
          )}
          <input ref={input} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
          {!receiptExtractionAvailable && <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-3"><ScanText className="size-3.5" /> A leitura automática dos comprovantes está chegando — por enquanto o arquivo fica guardado como anexo.</p>}
        </div>
        <Field label="Observações" htmlFor="ex-notes" className="sm:col-span-2"><Textarea id="ex-notes" rows={2} value={v.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
      </div>
    </DialogContent>
  );
}

export function RevenueDialog({ record, onDone }: { record: RevenueRecord | null; currency?: string; onDone: () => void }) {
  const [v, setV] = useState({
    description: record?.description ?? "", amount: record ? String(record.amount) : "", source: (record?.source === "order" ? "manual" : record?.source) ?? "manual",
    date: record?.date ?? today(), payment_method: record?.payment_method ?? "pix", notes: record?.notes ?? "",
  });
  const [pending, start] = useTransition();
  const set = (p: Partial<typeof v>) => setV({ ...v, ...p });
  return (
    <DialogContent title={record ? "Editar receita" : "Lançar receita"} description="Para dinheiro que não veio de um pedido — eventos, encomendas, vale-presente…"
      footer={<><Button variant="ghost" onClick={onDone}>Cancelar</Button>
        <Button variant="primary" loading={pending} disabled={!v.description.trim() || !v.amount} onClick={() => start(async () => {
          const r = await saveRevenueAction(record?.id ?? null, v);
          if (!r.ok) return void toast.error(r.error);
          toast.success("Receita salva"); onDone();
        })}>Salvar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Descrição" htmlFor="rv-desc" className="sm:col-span-2"><Input id="rv-desc" autoFocus value={v.description} onChange={(e) => set({ description: e.target.value })} placeholder="ex.: Almoço da empresa X" /></Field>
        <Field label="Valor (R$)" htmlFor="rv-amount"><Input id="rv-amount" type="number" min={0} step="0.01" value={v.amount} onChange={(e) => set({ amount: e.target.value })} /></Field>
        <Field label="Data" htmlFor="rv-date"><Input id="rv-date" type="date" value={v.date} onChange={(e) => set({ date: e.target.value })} /></Field>
        <Field label="Origem" htmlFor="rv-src">
          <Select id="rv-src" value={v.source} onChange={(e) => set({ source: e.target.value as typeof v.source })}>
            <option value="manual">Venda avulsa</option><option value="catering">Encomenda / buffet</option><option value="event">Evento</option><option value="other">Outra</option>
          </Select>
        </Field>
        <Field label="Forma de pagamento" htmlFor="rv-pay">
          <Select id="rv-pay" value={v.payment_method ?? ""} onChange={(e) => set({ payment_method: e.target.value })}>
            {PAYMENT_METHODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
        </Field>
        <Field label="Observações" htmlFor="rv-notes" className="sm:col-span-2"><Textarea id="rv-notes" rows={2} value={v.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
      </div>
    </DialogContent>
  );
}
