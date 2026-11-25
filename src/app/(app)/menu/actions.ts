"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { env } from "@/lib/env";
import { actionContext } from "@/lib/workspace";
import { menuItemSchema, UNITS } from "@/lib/validation";
import { friendlyError } from "@/lib/utils";
import type { ActionResult } from "@/lib/types";

const uuid = z.string().uuid();
function refresh() { revalidatePath("/menu"); revalidatePath("/dashboard"); revalidatePath("/orders"); }

export async function saveMenuItemAction(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  const ctx = await actionContext("menu", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const parsed = menuItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the item details." };
  const rid = ctx.ws.restaurant.id;
  if (parsed.data.photo_url && !parsed.data.photo_url.startsWith(`${env.supabaseUrl}/storage/v1/object/public/menu-photos/${rid}/`)) {
    return { ok: false, error: "Photos must be uploaded through Forkly." };
  }
  const row = { ...parsed.data, restaurant_id: rid };
  const q = id
    ? ctx.supabase.from("menu_items").update(row).eq("id", id).eq("restaurant_id", rid).select("id").single()
    : ctx.supabase.from("menu_items").insert(row).select("id").single();
  const { data, error } = await q;
  if (error || !data) return { ok: false, error: friendlyError(error) };
  refresh();
  return { ok: true, data: { id: data.id } };
}

export async function setAvailabilityAction(id: string, available: boolean): Promise<ActionResult> {
  const ctx = await actionContext("menu", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (!uuid.safeParse(id).success) return { ok: false, error: "Invalid item" };
  const { error } = await ctx.supabase.from("menu_items").update({ is_available: available }).eq("id", id).eq("restaurant_id", ctx.ws.restaurant.id);
  if (error) return { ok: false, error: friendlyError(error) };
  refresh();
  return { ok: true };
}

export async function deleteMenuItemAction(id: string): Promise<ActionResult> {
  const ctx = await actionContext("menu", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (!uuid.safeParse(id).success) return { ok: false, error: "Invalid item" };
  const { error } = await ctx.supabase.from("menu_items").delete().eq("id", id).eq("restaurant_id", ctx.ws.restaurant.id);
  if (error) return { ok: false, error: friendlyError(error) };
  refresh();
  return { ok: true };
}

const categoryName = z.string().trim().min(1, "Name the category").max(60);

export async function saveCategoryAction(id: string | null, name: string): Promise<ActionResult> {
  const ctx = await actionContext("menu", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const parsed = categoryName.safeParse(name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };
  const rid = ctx.ws.restaurant.id;
  let error;
  if (id) {
    ({ error } = await ctx.supabase.from("menu_categories").update({ name: parsed.data }).eq("id", id).eq("restaurant_id", rid));
  } else {
    const { count } = await ctx.supabase.from("menu_categories").select("id", { count: "exact", head: true }).eq("restaurant_id", rid);
    ({ error } = await ctx.supabase.from("menu_categories").insert({ restaurant_id: rid, name: parsed.data, position: count ?? 0 }));
  }
  if (error) return { ok: false, error: error.code === "23505" ? "A category with that name already exists." : friendlyError(error) };
  refresh();
  return { ok: true };
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const ctx = await actionContext("menu", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const { error } = await ctx.supabase.from("menu_categories").delete().eq("id", id).eq("restaurant_id", ctx.ws.restaurant.id);
  if (error) return { ok: false, error: friendlyError(error) };
  refresh();
  return { ok: true };
}

const recipeSchema = z.object({
  prep_minutes: z.coerce.number().int().min(0).max(600).nullable(),
  instructions: z.string().trim().max(4000).nullable().transform((v) => v || null),
  deduct_on_completion: z.boolean(),
  ingredients: z.array(z.object({
    inventory_item_id: uuid,
    quantity: z.coerce.number().positive("Quantities must be greater than zero").max(1e6),
    unit: z.enum(UNITS),
  })).max(60).refine((list) => new Set(list.map((i) => i.inventory_item_id)).size === list.length, "Each ingredient can only appear once"),
});

export async function saveRecipeAction(menuItemId: string, input: unknown): Promise<ActionResult> {
  const ctx = await actionContext("menu", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (!uuid.safeParse(menuItemId).success) return { ok: false, error: "Invalid item" };
  const parsed = recipeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the recipe." };
  const rid = ctx.ws.restaurant.id;
  const { ingredients, ...recipe } = parsed.data;

  const { data: saved, error } = await ctx.supabase
    .from("recipes")
    .upsert({ restaurant_id: rid, menu_item_id: menuItemId, ...recipe }, { onConflict: "menu_item_id" })
    .select("id").single();
  if (error || !saved) return { ok: false, error: friendlyError(error) };

  const { error: delErr } = await ctx.supabase.from("recipe_ingredients").delete().eq("recipe_id", saved.id);
  if (delErr) return { ok: false, error: friendlyError(delErr) };
  if (ingredients.length) {
    const { error: insErr } = await ctx.supabase.from("recipe_ingredients").insert(ingredients.map((i) => ({ ...i, restaurant_id: rid, recipe_id: saved.id })));
    if (insErr) return { ok: false, error: friendlyError(insErr) };
  }
  refresh();
  revalidatePath(`/menu/${menuItemId}`);
  return { ok: true };
}
