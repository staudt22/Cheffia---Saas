"use client";

import { useMemo, useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { ArrowDownUp, Download, MoreHorizontal, Paperclip, Pencil, Plus, Receipt, Repeat, Search, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { CategoryBars, RevenueChart, RevenueExpenseChart } from "@/components/dashboard/charts";
import { ExpenseDialog, RevenueDialog } from "@/components/finances/entry-dialogs";
import { deleteExpenseAction, deleteRevenueAction, receiptUrlAction, stopRecurringAction } from "@/app/(app)/finances/actions";
import { EXPENSE_LABELS, PAYMENT_METHODS } from "@/lib/validation";
import { cn, formatMoney, formatPercent, pctChange } from "@/lib/utils";
import type { DateRange } from "@/lib/dates";
import type { Expense, ExpenseCategory, RevenueRecord, Supplier } from "@/lib/types";

type Tx = { id: string; kind: "revenue" | "expense"; description: string; amount: number; date: string; category: string; payment: string | null; fromOrder: boolean; recurring: boolean; receipt: string | null; raw: Expense | RevenueRecord };
const REVENUE_LABELS: Record<string, string> = { order: "Pedidos", manual: "Venda avulsa", catering: "Encomenda / buffet", event: "Evento", other: "Outra receita" };

export function FinancesView({ range, totals, previous, daily, breakdown, expenses, revenue, recurring, suppliers, restaurantId, currency, locale, canEdit, initialTab }: {
  range: DateRange; totals: { revenue: number; expenses: number }; previous: { revenue: number; expenses: number };
  daily: { date: string; revenue: number; expenses: number }[]; breakdown: { category: string; amount: number }[];
  expenses: Expense[]; revenue: RevenueRecord[]; recurring: Expense[]; suppliers: Supplier[];
  restaurantId: string; currency: string; locale: string; canEdit: boolean; initialTab: "overview" | "transactions" | "recurring";
}) {
  const [tab, setTab] = useState(initialTab);
  const [expenseDialog, setExpenseDialog] = useState<Expense | "new" | null>(null);
  const [revenueDialog, setRevenueDialog] = useState<RevenueRecord | "new" | null>(null);
  const [confirm, setConfirm] = useState<Tx | null>(null);
  const [pending, start] = useTransition();
  const money = (v: number) => formatMoney(v, currency, locale);

  const profit = totals.revenue - totals.expenses;
  const prevProfit = previous.revenue - previous.expenses;
  const margin = totals.revenue ? profit / totals.revenue : null;
  const chartData = daily.map((d) => ({ label: format(parseISO(d.date), "dd/MM"), revenue: d.revenue, expenses: d.expenses }));
  const cashFlow = daily.reduce<{ label: string; revenue: number }[]>((acc, d) => {
    const prev = acc.at(-1)?.revenue ?? 0;
    acc.push({ label: format(parseISO(d.date), "dd/MM"), revenue: Math.round((prev + d.revenue - d.expenses) * 100) / 100 });
    return acc;
  }, []);
  const orderRevenue = revenue.filter((r) => r.source === "order").reduce((s, r) => s + Number(r.amount), 0);

  const kpis = [
    { label: "Faturamento", value: totals.revenue, prev: previous.revenue },
    { label: "Despesas", value: totals.expenses, prev: previous.expenses, invert: true },
    { label: "Lucro estimado", value: profit, prev: prevProfit },
  ];

  async function openReceipt(path: string) {
    const r = await receiptUrlAction(path);
    if (!r.ok || !r.data) return void toast.error(r.ok ? "Comprovante não encontrado" : r.error);
    window.open(r.data.url, "_blank", "noopener");
  }

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => {
          const ch = pctChange(k.value, k.prev);
          const good = ch == null ? null : k.invert ? ch < 0 : ch > 0;
          return (
            <Card key={k.label} className="p-4">
              <p className="text-[13px] text-ink-3">{k.label}</p>
              <p className={cn("mt-2 text-[22px] font-semibold tabular", k.label === "Lucro estimado" && k.value < 0 && "text-bad")}>{money(k.value)}</p>
              <p className="mt-1 text-xs text-ink-3">
                {ch == null ? "Sem dados anteriores" : <><span className={cn("font-medium", Math.abs(ch) < 0.0005 ? "" : good ? "text-good" : "text-bad")}>{ch > 0 ? "+" : ""}{formatPercent(ch, locale)}</span> vs período anterior</>}
              </p>
            </Card>
          );
        })}
        <Card className="p-4">
          <p className="text-[13px] text-ink-3">Margem de lucro</p>
          <p className={cn("mt-2 text-[22px] font-semibold tabular", margin != null && margin < 0 && "text-bad")}>{formatPercent(margin, locale)}</p>
          <p className="mt-1 text-xs text-ink-3">{totals.revenue ? `${formatPercent(orderRevenue / totals.revenue, locale, 0)} do faturamento vem de pedidos` : "Nenhum faturamento ainda"}</p>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented size="md" ariaLabel="Seção" value={tab} onChange={setTab} options={[{ value: "overview", label: "Resumo" }, { value: "transactions", label: "Lançamentos" }, { value: "recurring", label: "Contas fixas" }]} />
        {canEdit && (
          <div className="ml-auto flex gap-2">
            <Button onClick={() => setRevenueDialog("new")}><TrendingUp /> Lançar receita</Button>
            <Button variant="primary" onClick={() => setExpenseDialog("new")}><Plus /> Lançar despesa</Button>
          </div>
        )}
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Faturamento x despesas" description={range.label} />
            <div className="px-2 pb-3">
              {chartData.some((d) => d.revenue || d.expenses) ? <RevenueExpenseChart data={chartData} kind={range.days > 45 ? "line" : "bar"} currency={currency} locale={locale} height={280} />
                : <EmptyState className="py-10" icon={<Receipt />} title="Nada lançado neste período" description="Pedidos concluídos e despesas aparecem neste gráfico." />}
            </div>
          </Card>
          <Card>
            <CardHeader title="Para onde vai o dinheiro" description={money(totals.expenses)} />
            <div className="p-4">
              {breakdown.length ? <CategoryBars data={breakdown.map((b) => ({ label: EXPENSE_LABELS[b.category as ExpenseCategory] ?? b.category, amount: b.amount }))} currency={currency} locale={locale} />
                : <p className="py-6 text-center text-sm text-ink-3">Nenhuma despesa neste período.</p>}
            </div>
          </Card>
          <Card className="lg:col-span-3">
            <CardHeader title="Fluxo de caixa" description="Quanto sobrou no acumulado: entradas menos saídas, dia após dia" />
            <div className="px-2 pb-3 pt-2">
              {cashFlow.length > 1 ? <RevenueChart data={cashFlow} kind="line" currency={currency} locale={locale} height={200} /> : <p className="p-6 text-center text-sm text-ink-3">Escolha um período maior que um dia para ver o fluxo de caixa.</p>}
            </div>
          </Card>
        </div>
      )}

      {tab === "transactions" && (
        <Transactions
          expenses={expenses} revenue={revenue} money={money} canEdit={canEdit} rangeLabel={range.label}
          onEdit={(t) => (t.kind === "expense" ? setExpenseDialog(t.raw as Expense) : setRevenueDialog(t.raw as RevenueRecord))}
          onDelete={setConfirm} onReceipt={openReceipt}
        />
      )}

      {tab === "recurring" && (
        <Card>
          {recurring.length ? (
            <Table>
              <thead><tr><Th>Despesa</Th><Th>Repete</Th><Th>Próximo vencimento</Th><Th className="text-right">Valor</Th>{canEdit && <Th />}</tr></thead>
              <tbody>
                {recurring.map((e) => (
                  <Tr key={e.id}>
                    <Td><p className="font-medium">{e.description}</p><p className="text-xs text-ink-3">{EXPENSE_LABELS[e.category]}</p></Td>
                    <Td className="text-ink-2">{e.recurrence === "weekly" ? "Toda semana" : e.recurrence === "monthly" ? "Todo mês" : "Todo ano"}</Td>
                    <Td className="tabular">{e.next_due_on?.split("-").reverse().join("/") ?? "—"}</Td>
                    <Td className="text-right font-medium tabular">{money(Number(e.amount))}</Td>
                    {canEdit && <Td className="text-right"><Button size="sm" variant="ghost" onClick={() => setExpenseDialog(e)}><Pencil /> Editar</Button><Button size="sm" variant="ghost" onClick={() => start(async () => { const r = await stopRecurringAction(e.id); if (!r.ok) toast.error(r.error); else toast.success("Repetição encerrada — os lançamentos antigos continuam"); })}>Parar de repetir</Button></Td>}
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : <EmptyState icon={<Repeat />} title="Nenhuma conta fixa" description="Marque aluguel, salários ou assinaturas como repetidos e o CheffeData lança sozinho a cada período." />}
        </Card>
      )}

      <Dialog open={!!expenseDialog} onOpenChange={(o) => !o && setExpenseDialog(null)}>
        {expenseDialog && <ExpenseDialog expense={expenseDialog === "new" ? null : expenseDialog} suppliers={suppliers} restaurantId={restaurantId} currency={currency} onDone={() => setExpenseDialog(null)} />}
      </Dialog>
      <Dialog open={!!revenueDialog} onOpenChange={(o) => !o && setRevenueDialog(null)}>
        {revenueDialog && <RevenueDialog record={revenueDialog === "new" ? null : revenueDialog} currency={currency} onDone={() => setRevenueDialog(null)} />}
      </Dialog>
      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent size="sm" title={`Excluir “${confirm?.description}”?`} description={confirm?.recurring ? "Isso também para a repetição. Os lançamentos já feitos continuam." : "Não dá para desfazer."}
          footer={<><Button variant="ghost" onClick={() => setConfirm(null)}>Cancelar</Button><Button variant="danger" loading={pending} onClick={() => start(async () => {
            const r = confirm!.kind === "expense" ? await deleteExpenseAction(confirm!.raw.id) : await deleteRevenueAction(confirm!.raw.id);
            if (!r.ok) return void toast.error(r.error);
            toast.success("Excluído"); setConfirm(null);
          })}>Excluir</Button></>}><span /></DialogContent>
      </Dialog>
    </div>
  );
}

function Transactions({ expenses, revenue, money, canEdit, rangeLabel, onEdit, onDelete, onReceipt }: {
  expenses: Expense[]; revenue: RevenueRecord[]; money: (v: number) => string; canEdit: boolean; rangeLabel: string;
  onEdit: (t: Tx) => void; onDelete: (t: Tx) => void; onReceipt: (path: string) => void;
}) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "revenue" | "expense">("all");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<{ key: "date" | "amount"; dir: 1 | -1 }>({ key: "date", dir: -1 });
  const [limit, setLimit] = useState(50);
  const [groupOrders, setGroupOrders] = useState(true);

  const all = useMemo<Tx[]>(() => {
    const exp: Tx[] = expenses.map((e) => ({ id: `e-${e.id}`, kind: "expense", description: e.description, amount: Number(e.amount), date: e.date, category: e.category, payment: e.payment_method, fromOrder: false, recurring: e.is_recurring || !!e.recurring_parent_id, receipt: e.receipt_path, raw: e }));
    let rev: Tx[] = revenue.map((r) => ({ id: `r-${r.id}`, kind: "revenue", description: r.description, amount: Number(r.amount), date: r.date, category: r.source, payment: r.payment_method, fromOrder: !!r.order_id, recurring: false, receipt: null, raw: r }));
    if (groupOrders) {
      const byDay = new Map<string, { total: number; count: number }>();
      for (const r of rev.filter((x) => x.fromOrder)) { const e = byDay.get(r.date) ?? { total: 0, count: 0 }; e.total += r.amount; e.count++; byDay.set(r.date, e); }
      rev = [...rev.filter((x) => !x.fromOrder), ...[...byDay.entries()].map(([date, v]) => ({
        id: `orders-${date}`, kind: "revenue" as const, description: `${v.count} ${v.count === 1 ? "pedido concluído" : "pedidos concluídos"}`, amount: Math.round(v.total * 100) / 100, date, category: "order", payment: null, fromOrder: true, recurring: false, receipt: null, raw: { id: "" } as RevenueRecord,
      }))];
    }
    return [...exp, ...rev];
  }, [expenses, revenue, groupOrders]);

  const shown = all
    .filter((t) => (kind === "all" || t.kind === kind) && (!category || t.category === category) && (!q || t.description.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => (sort.key === "date" ? a.date.localeCompare(b.date) || a.amount - b.amount : a.amount - b.amount) * sort.dir);

  function exportCsv() {
    const rows = [["Data", "Tipo", "Descrição", "Categoria", "Forma de pagamento", "Valor"], ...shown.map((t) => [t.date.split("-").reverse().join("/"), t.kind === "revenue" ? "Entrada" : "Saída", t.description, t.kind === "expense" ? EXPENSE_LABELS[t.category as ExpenseCategory] : REVENUE_LABELS[t.category], t.payment ?? "", (t.kind === "expense" ? -t.amount : t.amount).toFixed(2).replace(".", ",")])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `cheffedata-lancamentos-${rangeLabel.replace(/\W+/g, "-").toLowerCase()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const toggleSort = (key: "date" | "amount") => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : -1 }));
  const categories = kind === "revenue" ? Object.entries(REVENUE_LABELS) : kind === "expense" ? Object.entries(EXPENSE_LABELS) : [...Object.entries(EXPENSE_LABELS), ...Object.entries(REVENUE_LABELS).filter(([k]) => k !== "other").map(([k, v]) => [k, `${v} (receita)`])];

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <div className="relative min-w-48 flex-1 sm:max-w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar lançamentos" className="pl-9" aria-label="Buscar lançamentos" />
        </div>
        <Select value={kind} onChange={(e) => { setKind(e.target.value as typeof kind); setCategory(""); }} className="w-36" aria-label="Tipo">
          <option value="all">Entradas e saídas</option><option value="revenue">Só entradas</option><option value="expense">Só saídas</option>
        </Select>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-44" aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {categories.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <label className="flex items-center gap-2 text-xs text-ink-2"><input type="checkbox" checked={groupOrders} onChange={(e) => setGroupOrders(e.target.checked)} className="accent-[var(--brand)]" /> Agrupar pedidos por dia</label>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={exportCsv} disabled={!shown.length}><Download /> Exportar planilha (CSV)</Button>
      </div>
      {shown.length ? (
        <>
          <Table>
            <thead><tr>
              <Th><button className="inline-flex items-center gap-1 hover:text-ink" onClick={() => toggleSort("date")}>Data <ArrowDownUp className="size-3" /></button></Th>
              <Th>Descrição</Th><Th className="hidden sm:table-cell">Categoria</Th><Th className="hidden md:table-cell">Pagamento</Th>
              <Th className="text-right"><button className="inline-flex items-center gap-1 hover:text-ink" onClick={() => toggleSort("amount")}>Valor <ArrowDownUp className="size-3" /></button></Th>
              <Th className="w-10" />
            </tr></thead>
            <tbody>
              {shown.slice(0, limit).map((t) => (
                <Tr key={t.id}>
                  <Td className="whitespace-nowrap text-ink-2 tabular">{t.date.split("-").reverse().join("/")}</Td>
                  <Td>
                    <span className="flex items-center gap-2">
                      {t.kind === "revenue" ? <TrendingUp className="size-3.5 shrink-0 text-good" /> : <TrendingDown className="size-3.5 shrink-0 text-ink-3" />}
                      <span className="truncate">{t.description}</span>
                      {t.recurring && <Repeat className="size-3 shrink-0 text-ink-3" aria-label="Conta fixa" />}
                      {t.receipt && <button onClick={() => onReceipt(t.receipt!)} className="text-ink-3 hover:text-ink" aria-label="Ver comprovante"><Paperclip className="size-3.5" /></button>}
                    </span>
                  </Td>
                  <Td className="hidden sm:table-cell"><Badge tone={t.kind === "revenue" ? "good" : "neutral"}>{t.kind === "expense" ? EXPENSE_LABELS[t.category as ExpenseCategory] : REVENUE_LABELS[t.category] ?? t.category}</Badge></Td>
                  <Td className="hidden text-ink-2 md:table-cell">{PAYMENT_METHODS.find((p) => p.value === t.payment)?.label ?? t.payment ?? "—"}</Td>
                  <Td className={cn("text-right font-medium tabular", t.kind === "revenue" && "text-good")}>{t.kind === "revenue" ? "+" : "−"}{money(t.amount)}</Td>
                  <Td>
                    {canEdit && !t.fromOrder && (
                      <Dropdown>
                        <DropdownTrigger asChild><Button size="icon-sm" variant="ghost" aria-label="Ações"><MoreHorizontal /></Button></DropdownTrigger>
                        <DropdownContent>
                          <DropdownItem onSelect={() => onEdit(t)}><Pencil /> Editar</DropdownItem>
                          <DropdownSeparator />
                          <DropdownItem destructive onSelect={() => onDelete(t)}><Trash2 /> Excluir</DropdownItem>
                        </DropdownContent>
                      </Dropdown>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          {shown.length > limit && <div className="border-t border-line p-3 text-center"><Button size="sm" variant="ghost" onClick={() => setLimit(limit + 100)}>Mostrar mais ({shown.length - limit} restantes)</Button></div>}
        </>
      ) : <EmptyState icon={<Receipt />} title="Nenhum lançamento" description="Nada encontrado neste período. Tente outras datas ou filtros." />}
    </Card>
  );
}
