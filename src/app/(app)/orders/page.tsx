import Link from "next/link";
import { MonitorPlay } from "lucide-react";
import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { OrdersView } from "@/components/orders/orders-view";
import { NewOrderButton } from "@/components/orders/new-order-dialog";
import { ACTIVE_STATUSES } from "@/lib/orders";
import type { MenuCategory, MenuItem, Order, OrderSource, OrderStatus } from "@/lib/types";

export const metadata = { title: "Orders" };

const TABS = ["active", "completed", "cancelled", "all"] as const;
const SOURCES: OrderSource[] = ["website", "manual", "pos", "ifood", "ubereats", "doordash", "other"];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ws = await requireWorkspace("orders");
  const params = await searchParams;
  const tab = (TABS as readonly string[]).includes(params.tab ?? "") ? (params.tab as (typeof TABS)[number]) : "active";
  const source = SOURCES.includes(params.source as OrderSource) ? (params.source as OrderSource) : undefined;
  const q = (params.q ?? "").trim().slice(0, 60);
  const supabase = await createClient();
  const rid = ws.restaurant.id;

  let query = supabase
    .from("orders")
    .select("*, order_items(id, menu_item_id, name, quantity, unit_price, modifiers, notes, total)")
    .eq("restaurant_id", rid)
    .order("created_at", { ascending: tab === "active" })
    .limit(tab === "active" ? 200 : 100);
  if (tab === "active") query = query.in("status", ACTIVE_STATUSES);
  if (tab === "completed") query = query.eq("status", "completed" satisfies OrderStatus);
  if (tab === "cancelled") query = query.eq("status", "cancelled" satisfies OrderStatus);
  if (source) query = query.eq("source", source);
  if (q) {
    const num = Number(q.replace("#", ""));
    const safe = q.replace(/[%,()]/g, " ");
    query = Number.isInteger(num) && num > 0 ? query.eq("number", num) : query.or(`customer_name.ilike.%${safe}%,table_label.ilike.%${safe}%,customer_phone.ilike.%${safe}%`);
  }

  const [{ data: orders }, { data: counts }, { data: menu }, { data: categories }] = await Promise.all([
    query,
    supabase.from("orders").select("status").eq("restaurant_id", rid).in("status", ACTIVE_STATUSES),
    supabase.from("menu_items").select("id, name, price, category_id, is_available, description, photo_url, position").eq("restaurant_id", rid).eq("is_available", true).order("position"),
    supabase.from("menu_categories").select("id, name, position").eq("restaurant_id", rid).order("position"),
  ]);

  // Opening a specific order from a link (e.g. dashboard) even if it's outside the tab.
  let focus: Order | null = null;
  if (params.order && !(orders ?? []).some((o) => o.id === params.order)) {
    const { data } = await supabase.from("orders").select("*, order_items(id, menu_item_id, name, quantity, unit_price, modifiers, notes, total)").eq("id", params.order).eq("restaurant_id", rid).maybeSingle();
    focus = (data as Order) ?? null;
  }

  const canEdit = ws.permissions.orders.edit;
  return (
    <div>
      <PageHeader
        title="Orders"
        description="Every order, from every channel, in one queue."
        actions={<>
          <Button asChild variant="secondary"><Link href="/orders/kitchen"><MonitorPlay /> Kitchen display</Link></Button>
          {canEdit && <NewOrderButton menu={(menu ?? []) as MenuItem[]} categories={(categories ?? []) as MenuCategory[]} currency={ws.restaurant.currency} locale={ws.restaurant.locale} defaultOpen={params.new === "1"} />}
        </>}
      />
      <OrdersView
        orders={(orders ?? []) as Order[]}
        focus={focus}
        tab={tab}
        source={source}
        q={q}
        activeCount={counts?.length ?? 0}
        currency={ws.restaurant.currency}
        locale={ws.restaurant.locale}
        timezone={ws.restaurant.timezone}
        canEdit={canEdit}
        openOrderId={params.order}
      />
    </div>
  );
}
