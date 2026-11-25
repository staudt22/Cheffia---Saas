"use client";

import { RelativeTime } from "@/components/ui/relative-time";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChefHat, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { SourceBadge } from "@/components/orders/source-badge";
import { OrderDetailSheet } from "@/components/orders/order-detail";
import { FULFILLMENT_LABEL, SOURCE_META, STATUS_META } from "@/lib/orders";
import { formatTime } from "@/lib/dates";
import { useRealtimeOrders } from "@/components/orders/use-realtime";
import { cn, formatMoney } from "@/lib/utils";
import type { Order } from "@/lib/types";

const TABS = [
  { key: "active", label: "In progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
];

export function OrdersView({
  orders, focus, tab, source, q, activeCount, currency, locale, timezone, canEdit, openOrderId,
}: {
  orders: Order[]; focus: Order | null; tab: string; source?: string; q: string; activeCount: number;
  currency: string; locale: string; timezone: string; canEdit: boolean; openOrderId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [search, setSearch] = useState(q);
  const [selectedId, setSelectedId] = useState<string | null>(openOrderId ?? null);
  const [pending, start] = useTransition();
  useRealtimeOrders();

  function setParam(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("order");
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  useEffect(() => {
    const t = setTimeout(() => { if (search !== q) setParam({ q: search || undefined }); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const selected = orders.find((o) => o.id === selectedId) ?? (focus?.id === selectedId ? focus : null);
  const money = (v: number) => formatMoney(v, currency, locale);

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-surface-3 p-1" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setParam({ tab: t.key === "active" ? undefined : t.key })}
              className={cn("flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition", tab === t.key ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink-2")}>
              {t.label}
              {t.key === "active" && activeCount > 0 && <span className="rounded-full bg-brand px-1.5 text-[11px] text-brand-foreground tabular">{activeCount}</span>}
            </button>
          ))}
        </div>
        <div className="flex flex-1 gap-2 lg:justify-end">
          <div className="relative flex-1 lg:max-w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Order #, customer, table…" className="pl-9" aria-label="Search orders" />
          </div>
          <Select value={source ?? ""} onChange={(e) => setParam({ source: e.target.value || undefined })} className="w-40" aria-label="Filter by source">
            <option value="">All sources</option>
            {Object.entries(SOURCE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </div>
      </div>

      <Card className={cn("transition-opacity", pending && "opacity-60")}>
        {orders.length ? (
          <Table>
            <thead><tr><Th>Order</Th><Th>Received</Th><Th>Customer</Th><Th>Source</Th><Th className="hidden md:table-cell">Items</Th><Th>Status</Th><Th className="text-right">Total</Th></tr></thead>
            <tbody>
              {orders.map((o) => {
                const items = o.order_items ?? [];
                return (
                  <Tr key={o.id} className="cursor-pointer" onClick={() => setSelectedId(o.id)}>
                    <Td className="font-semibold tabular">#{o.number}</Td>
                    <Td className="whitespace-nowrap text-ink-2">
                      {formatTime(o.created_at, locale, timezone)}
                      <span className="ml-1.5 text-xs text-ink-3">{tab === "active" ? <RelativeTime date={o.created_at} /> : new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: timezone }).format(new Date(o.created_at))}</span>
                    </Td>
                    <Td className="max-w-40 truncate">{o.customer_name ?? o.table_label ?? <span className="text-ink-3">{FULFILLMENT_LABEL[o.fulfillment]}</span>}</Td>
                    <Td><SourceBadge source={o.source} simulated={o.is_simulated} /></Td>
                    <Td className="hidden max-w-64 truncate text-ink-2 md:table-cell">{items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</Td>
                    <Td><Badge tone={STATUS_META[o.status].tone}>{STATUS_META[o.status].label}</Badge></Td>
                    <Td className="text-right font-medium tabular">{money(o.total)}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <EmptyState
            icon={<ChefHat />}
            title={q || source ? "No orders match these filters" : tab === "active" ? "No orders in progress" : "No orders yet"}
            description={q || source ? "Try a different search or source." : "New orders from every channel will appear here as they come in."}
          />
        )}
      </Card>

      <OrderDetailSheet
        order={selected}
        onOpenChange={(open) => { if (!open) setSelectedId(null); }}
        currency={currency}
        locale={locale}
        timezone={timezone}
        canEdit={canEdit}
      />
    </>
  );
}
