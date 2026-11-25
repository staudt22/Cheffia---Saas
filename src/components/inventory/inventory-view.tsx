"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { AlertTriangle, ArrowDownToLine, CalendarClock, History, Package, PackageX, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import { InventoryItemDialog, ItemSheet } from "@/components/inventory/item-dialogs";
import { addDays, format, parseISO } from "date-fns";
import { cn, formatMoney, formatNumber, formatQuantity } from "@/lib/utils";
import type { InventoryItem, Supplier } from "@/lib/types";

export interface MovementRow { id: string; inventory_item_id: string; type: string; quantity_delta: number; unit_cost: number | null; reason: string | null; created_at: string; item: string; unit: string }

export const MOVEMENT_LABEL: Record<string, string> = {
  purchase: "Purchase", usage: "Usage", waste: "Waste", adjustment: "Adjustment", order_deduction: "Order", po_receipt: "Purchase order", initial: "Opening stock",
};

export function stockStatus(i: InventoryItem, today: string) {
  const q = Number(i.quantity), min = Number(i.min_quantity);
  if (q <= 0) return "out" as const;
  if (min > 0 && q <= min) return "low" as const;
  if (i.expires_on && i.expires_on <= format(addDays(parseISO(today), 3), "yyyy-MM-dd")) return "expiring" as const;
  return "ok" as const;
}

export function StatusBadge({ status, expires }: { status: ReturnType<typeof stockStatus>; expires?: string | null }) {
  if (status === "out") return <Badge tone="bad"><PackageX /> Out of stock</Badge>;
  if (status === "low") return <Badge tone="warn"><AlertTriangle /> Low</Badge>;
  if (status === "expiring") return <Badge tone="info"><CalendarClock /> Expires {expires}</Badge>;
  return <Badge tone="good">In stock</Badge>;
}

export function InventoryView({ items, suppliers, movements, today, currency, locale, timezone, canEdit, initialFilter, openNew }: {
  items: InventoryItem[]; suppliers: Supplier[]; movements: MovementRow[]; today: string; currency: string; locale: string; timezone: string;
  canEdit: boolean; initialFilter: "all" | "low" | "expiring"; openNew: boolean;
}) {
  const [view, setView] = useState<"stock" | "history">("stock");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [filter, setFilter] = useState(initialFilter);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<InventoryItem | "new" | null>(openNew ? "new" : null);
  const money = (v: number) => formatMoney(v, currency, locale);

  const categories = [...new Set(items.map((i) => i.category))].sort();
  const enriched = items.map((i) => ({ ...i, status: stockStatus(i, today) }));
  const shown = useMemo(() => enriched.filter((i) =>
    (!q || i.name.toLowerCase().includes(q.toLowerCase())) &&
    (!category || i.category === category) &&
    (filter === "all" || (filter === "low" ? i.status === "low" || i.status === "out" : i.status === "expiring")),
  ), [enriched, q, category, filter]);
  const value = items.reduce((s, i) => s + Math.max(Number(i.quantity), 0) * Number(i.unit_cost), 0);
  const low = enriched.filter((i) => i.status === "low" || i.status === "out").length;
  const expiring = enriched.filter((i) => i.status === "expiring").length;
  const selected = items.find((i) => i.id === selectedId) ?? null;

  return (
    <div>
      <PageHeader title="Inventory" description="Stock levels update automatically from purchases, usage, waste and completed orders."
        actions={canEdit && <Button variant="primary" onClick={() => setEditing("new")}><Plus /> Add item</Button>} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Items tracked", value: formatNumber(items.length, locale), icon: Package },
          { label: "Stock value", value: money(value), icon: ArrowDownToLine },
          { label: "Low or out", value: formatNumber(low, locale), icon: AlertTriangle, tone: low ? "text-warn" : undefined, onClick: () => { setView("stock"); setFilter("low"); } },
          { label: "Expiring in 3 days", value: formatNumber(expiring, locale), icon: CalendarClock, tone: expiring ? "text-info" : undefined, onClick: () => { setView("stock"); setFilter("expiring"); } },
        ].map((k) => (
          <button key={k.label} type="button" onClick={k.onClick} disabled={!k.onClick} className="rounded-lg bg-surface p-4 text-left shadow-card transition enabled:hover:shadow-pop disabled:cursor-default">
            <p className="flex items-center gap-1.5 text-[13px] text-ink-3"><k.icon className="size-3.5" /> {k.label}</p>
            <p className={cn("mt-2 text-xl font-semibold tabular", k.tone)}>{k.value}</p>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <Segmented size="md" ariaLabel="View" value={view} onChange={setView} options={[{ value: "stock", label: "Stock" }, { value: "history", label: "Movement history" }]} />
        {view === "stock" && (
          <div className="flex flex-1 flex-wrap gap-2 md:justify-end">
            <div className="relative min-w-48 flex-1 md:max-w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items" className="pl-9" aria-label="Search inventory" />
            </div>
            <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-40" aria-label="Category">
              <option value="">All categories</option>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </Select>
            <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="w-40" aria-label="Status">
              <option value="all">All statuses</option>
              <option value="low">Low or out</option>
              <option value="expiring">Expiring soon</option>
            </Select>
          </div>
        )}
      </div>

      {view === "stock" ? (
        <Card>
          {shown.length ? (
            <Table>
              <thead><tr><Th>Item</Th><Th>In stock</Th><Th className="hidden md:table-cell">Level</Th><Th className="hidden text-right sm:table-cell">Cost / unit</Th><Th className="hidden text-right lg:table-cell">Value</Th><Th className="hidden lg:table-cell">Location</Th><Th>Status</Th></tr></thead>
              <tbody>
                {shown.map((i) => {
                  const q = Number(i.quantity), min = Number(i.min_quantity);
                  const pct = min > 0 ? Math.min(q / (min * 2), 1) : 1;
                  return (
                    <Tr key={i.id} className="cursor-pointer" onClick={() => setSelectedId(i.id)}>
                      <Td><p className="font-medium">{i.name}</p><p className="text-xs text-ink-3">{i.category}</p></Td>
                      <Td className="whitespace-nowrap tabular">{formatQuantity(q, i.unit, locale)}</Td>
                      <Td className="hidden w-40 md:table-cell">
                        <div className="h-1.5 w-full rounded-full bg-surface-3" title={min ? `Minimum ${min} ${i.unit}` : "No minimum set"}>
                          <div className={cn("h-full rounded-full", i.status === "out" || i.status === "low" ? "bg-warn" : "bg-good")} style={{ width: `${Math.max(pct * 100, q > 0 ? 4 : 0)}%` }} />
                        </div>
                        {min > 0 && <p className="mt-1 text-[11px] text-ink-3">min {formatNumber(min, locale, 2)}</p>}
                      </Td>
                      <Td className="hidden text-right tabular text-ink-2 sm:table-cell">{money(Number(i.unit_cost))}</Td>
                      <Td className="hidden text-right tabular lg:table-cell">{money(Math.max(q, 0) * Number(i.unit_cost))}</Td>
                      <Td className="hidden text-ink-2 lg:table-cell">{i.storage_location ?? "—"}</Td>
                      <Td><StatusBadge status={i.status} expires={i.expires_on} /></Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          ) : (
            <EmptyState icon={<Package />} title={items.length ? "No items match" : "No inventory yet"}
              description={items.length ? "Try clearing the filters." : "Add the ingredients and supplies you buy. Recipes use them to calculate food cost."}
              action={!items.length && canEdit ? <Button variant="primary" onClick={() => setEditing("new")}><Plus /> Add your first item</Button> : undefined} />
          )}
        </Card>
      ) : (
        <Card>
          {movements.length ? (
            <Table>
              <thead><tr><Th>When</Th><Th>Item</Th><Th>Type</Th><Th className="text-right">Change</Th><Th className="hidden md:table-cell">Note</Th></tr></thead>
              <tbody>
                {movements.map((m) => (
                  <Tr key={m.id}>
                    <Td className="whitespace-nowrap text-ink-2" title={new Date(m.created_at).toLocaleString(locale, { timeZone: timezone })}>{formatDistanceToNowStrict(new Date(m.created_at), { addSuffix: true })}</Td>
                    <Td className="font-medium">{m.item}</Td>
                    <Td><Badge tone={m.type === "waste" ? "bad" : m.type === "purchase" || m.type === "po_receipt" ? "good" : "neutral"}>{MOVEMENT_LABEL[m.type] ?? m.type}</Badge></Td>
                    <Td className={cn("text-right font-medium tabular", m.quantity_delta > 0 ? "text-good" : "text-ink")}>{m.quantity_delta > 0 ? "+" : ""}{formatNumber(m.quantity_delta, locale, 3)} {m.unit}</Td>
                    <Td className="hidden max-w-72 truncate text-ink-3 md:table-cell">{m.reason ?? "—"}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : <EmptyState icon={<History />} title="No movements yet" description="Purchases, usage, waste and order deductions are logged here." />}
        </Card>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        {selected && <ItemSheet item={selected} movements={movements.filter((m) => m.inventory_item_id === selected.id)} status={stockStatus(selected, today)}
          suppliers={suppliers} currency={currency} locale={locale} canEdit={canEdit} onEdit={() => { setEditing(selected); setSelectedId(null); }} onDeleted={() => setSelectedId(null)} />}
      </Dialog>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && <InventoryItemDialog item={editing === "new" ? null : editing} suppliers={suppliers} categories={categories} currency={currency} onDone={() => setEditing(null)} />}
      </Dialog>
    </div>
  );
}
