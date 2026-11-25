import { notFound } from "next/navigation";
import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { RecipeBuilder } from "@/components/menu/recipe-builder";
import type { InventoryItem, InventoryUnit, MenuItem } from "@/lib/types";

export const metadata = { title: "Recipe" };

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ws = await requireWorkspace("menu");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const rid = ws.restaurant.id;
  const [{ data: item }, { data: recipe }, { data: inventory }] = await Promise.all([
    supabase.from("menu_items").select("*").eq("id", id).eq("restaurant_id", rid).maybeSingle(),
    supabase.from("recipes").select("id, prep_minutes, instructions, deduct_on_completion, recipe_ingredients(inventory_item_id, quantity, unit)").eq("menu_item_id", id).maybeSingle(),
    ws.permissions.inventory.view
      ? supabase.from("inventory_items").select("id, name, unit, unit_cost, quantity, category").eq("restaurant_id", rid).order("name")
      : Promise.resolve({ data: [] }),
  ]);
  if (!item) notFound();
  return (
    <RecipeBuilder
      item={item as MenuItem}
      recipe={recipe ? {
        prep_minutes: recipe.prep_minutes, instructions: recipe.instructions, deduct_on_completion: recipe.deduct_on_completion,
        ingredients: (recipe.recipe_ingredients ?? []).map((r) => ({ inventory_item_id: r.inventory_item_id, quantity: Number(r.quantity), unit: r.unit as InventoryUnit })),
      } : null}
      inventory={(inventory ?? []) as InventoryItem[]}
      autoDeduct={ws.settings.inventory_auto_deduct}
      currency={ws.restaurant.currency}
      locale={ws.restaurant.locale}
      canEdit={ws.permissions.menu.edit}
      canSeeInventory={ws.permissions.inventory.view}
    />
  );
}
