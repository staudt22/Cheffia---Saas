import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { KitchenDisplay } from "@/components/orders/kitchen-display";
import type { Order } from "@/lib/types";

export const metadata = { title: "Kitchen display" };

export default async function KitchenPage() {
  const ws = await requireWorkspace("orders");
  const supabase = await createClient();
  const since = new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString();
  const [{ data: active }, { data: done }] = await Promise.all([
    supabase.from("orders").select("*, order_items(id, menu_item_id, name, quantity, unit_price, modifiers, notes, total)")
      .eq("restaurant_id", ws.restaurant.id).in("status", ["new", "accepted", "preparing", "ready"]).order("created_at").limit(120),
    supabase.from("orders").select("id, number, completed_at").eq("restaurant_id", ws.restaurant.id).eq("status", "completed").gte("completed_at", since).order("completed_at", { ascending: false }).limit(1),
  ]);
  return (
    <KitchenDisplay
      orders={(active ?? []) as Order[]}
      lastCompleted={(done?.[0] as { id: string; number: number } | undefined) ?? null}
      restaurantId={ws.restaurant.id}
      locale={ws.restaurant.locale}
      timezone={ws.restaurant.timezone}
      canEdit={ws.permissions.orders.edit}
    />
  );
}
