import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { todayIn } from "@/lib/dates";
import { InventoryView } from "@/components/inventory/inventory-view";
import type { InventoryItem, Supplier } from "@/lib/types";

export const metadata = { title: "Estoque" };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ws = await requireWorkspace("inventory");
  const params = await searchParams;
  const supabase = await createClient();
  const rid = ws.restaurant.id;
  const [{ data: items }, { data: suppliers }, { data: movements }] = await Promise.all([
    supabase.from("inventory_items").select("*").eq("restaurant_id", rid).order("name"),
    ws.permissions.suppliers.view ? supabase.from("suppliers").select("id, name, contact_name, phone, email").eq("restaurant_id", rid).order("name") : Promise.resolve({ data: [] }),
    supabase.from("inventory_movements").select("id, inventory_item_id, type, quantity_delta, unit_cost, reason, created_at, inventory_items(name, unit)").eq("restaurant_id", rid).order("created_at", { ascending: false }).limit(150),
  ]);
  return (
    <InventoryView
      items={(items ?? []) as InventoryItem[]}
      suppliers={(suppliers ?? []) as Supplier[]}
      movements={(movements ?? []).map((m) => {
        const i = m.inventory_items as unknown as { name: string; unit: string } | null;
        return { id: m.id, inventory_item_id: m.inventory_item_id, type: m.type, quantity_delta: Number(m.quantity_delta), unit_cost: m.unit_cost == null ? null : Number(m.unit_cost), reason: m.reason, created_at: m.created_at, item: i?.name ?? "—", unit: i?.unit ?? "" };
      })}
      today={todayIn(ws.restaurant.timezone)}
      currency={ws.restaurant.currency}
      locale={ws.restaurant.locale}
      timezone={ws.restaurant.timezone}
      canEdit={ws.permissions.inventory.edit}
      initialFilter={params.filter === "low" || params.filter === "expiring" ? params.filter : "all"}
      openNew={params.new === "1"}
    />
  );
}
