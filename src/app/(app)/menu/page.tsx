import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { MenuView } from "@/components/menu/menu-view";
import type { MenuCategory, MenuItem } from "@/lib/types";

export const metadata = { title: "Cardápio" };

export default async function MenuPage() {
  const ws = await requireWorkspace("menu");
  const supabase = await createClient();
  const rid = ws.restaurant.id;
  const [{ data: items }, { data: categories }, { data: costs }] = await Promise.all([
    supabase.from("menu_items").select("*").eq("restaurant_id", rid).order("position").order("name"),
    supabase.from("menu_categories").select("id, name, position").eq("restaurant_id", rid).order("position"),
    supabase.from("menu_item_costs").select("menu_item_id, food_cost, ingredient_count, has_unit_mismatch").eq("restaurant_id", rid),
  ]);
  return (
    <MenuView
      items={(items ?? []) as MenuItem[]}
      categories={(categories ?? []) as MenuCategory[]}
      costs={Object.fromEntries((costs ?? []).map((c) => [c.menu_item_id, { foodCost: Number(c.food_cost), ingredients: Number(c.ingredient_count) }]))}
      restaurantId={rid}
      currency={ws.restaurant.currency}
      locale={ws.restaurant.locale}
      canEdit={ws.permissions.menu.edit}
    />
  );
}
