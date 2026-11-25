import { redirect } from "next/navigation";
import { lockedAreas } from "@/lib/billing";
import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { isoHoursAgo } from "@/lib/dates";
import { TabsBoard, type TabRow } from "@/components/comandas/tabs-board";
import type { MenuCategory, MenuItem } from "@/lib/types";

export const metadata = { title: "Comandas" };

const TAB_SELECT = "id, number, label, customer_name, guests, status, subtotal, service_fee, total, payment_method, opened_at, closed_at, opened_by, orders(id, number, status, total, created_at, order_items(id, name, quantity, unit_price, modifiers, total))";

export default async function ComandasPage() {
  const ws = await requireWorkspace("orders");
  if (lockedAreas(ws.restaurant.plan).includes("/comandas")) redirect("/upgrade?area=%2Fcomandas");
  const supabase = await createClient();
  const rid = ws.restaurant.id;
  const [{ data: open }, { data: closed }, { data: menu }, { data: categories }, { data: members }] = await Promise.all([
    supabase.from("tabs").select(TAB_SELECT).eq("restaurant_id", rid).eq("status", "open").order("opened_at"),
    supabase.from("tabs").select(TAB_SELECT).eq("restaurant_id", rid).neq("status", "open").gte("opened_at", isoHoursAgo(24 * 7)).order("closed_at", { ascending: false }).limit(60),
    supabase.from("menu_items").select("id, name, price, category_id, is_available, description, photo_url, position").eq("restaurant_id", rid).eq("is_available", true).order("position"),
    supabase.from("menu_categories").select("id, name, position").eq("restaurant_id", rid).order("position"),
    supabase.from("restaurant_members").select("user_id").eq("restaurant_id", rid),
  ]);
  const ids = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
  const names = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name ?? "Equipe"]));

  return (
    <TabsBoard
      open={(open ?? []) as unknown as TabRow[]}
      closed={(closed ?? []) as unknown as TabRow[]}
      menu={(menu ?? []) as MenuItem[]}
      categories={(categories ?? []) as MenuCategory[]}
      staffNames={names}
      restaurantId={rid}
      currency={ws.restaurant.currency}
      locale={ws.restaurant.locale}
      timezone={ws.restaurant.timezone}
      canEdit={ws.permissions.orders.edit}
    />
  );
}
