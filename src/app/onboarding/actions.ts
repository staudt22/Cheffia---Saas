"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { actionContext, ACTIVE_RESTAURANT_COOKIE, getUser } from "@/lib/workspace";
import { inventoryItemSchema, inviteSchema, restaurantProfileSchema } from "@/lib/validation";
import { friendlyError } from "@/lib/utils";
import { DASHBOARD_PRESETS, type PresetKey } from "@/lib/dashboard/widgets";
import type { ActionResult } from "@/lib/types";
import { z } from "zod";

async function setActiveCookie(id: string) {
  const store = await cookies();
  store.set(ACTIVE_RESTAURANT_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
}

export async function createRestaurantAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  if (!(await getUser())) return { ok: false, error: "Please sign in again." };
  const parsed = restaurantProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid values" };
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("create_restaurant", { p_name: parsed.data.name });
  if (error || !id) return { ok: false, error: friendlyError(error) };
  const { name: _n, ...rest } = parsed.data;
  void _n;
  await supabase.from("restaurants").update({ ...rest, onboarding_step: 3 }).eq("id", id);
  await setActiveCookie(id as string);
  revalidatePath("/", "layout");
  return { ok: true, data: { id: id as string } };
}

export async function createDemoWorkspaceAction(input: { name?: string; timezone?: string }): Promise<ActionResult> {
  if (!(await getUser())) return { ok: false, error: "Please sign in again." };
  const supabase = await createClient();
  const name = (input.name?.trim() || "Ember & Oak (Demo)").slice(0, 120);
  const { data: id, error } = await supabase.rpc("create_restaurant", { p_name: name, p_is_demo: true });
  if (error || !id) return { ok: false, error: friendlyError(error) };
  let tz = "UTC";
  try { if (input.timezone) { new Intl.DateTimeFormat("en-US", { timeZone: input.timezone }); tz = input.timezone; } } catch {}
  await supabase.from("restaurants").update({ timezone: tz, restaurant_type: "Burger & grill" }).eq("id", id);
  const { error: seedError } = await supabase.rpc("seed_demo_restaurant", { p_restaurant: id });
  if (seedError) return { ok: false, error: friendlyError(seedError, "The demo data could not be created.") };
  await setActiveCookie(id as string);
  revalidatePath("/", "layout");
  return { ok: true };
}

const quickMenuSchema = z.array(z.object({
  name: z.string().trim().min(1).max(120),
  price: z.coerce.number().min(0).max(100000),
  category: z.string().trim().min(1).max(60),
})).min(1).max(50);

export async function addMenuItemsAction(input: unknown): Promise<ActionResult<{ count: number }>> {
  const ctx = await actionContext("menu", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const parsed = quickMenuSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Each item needs a name, a price and a category." };
  const rid = ctx.ws.restaurant.id;
  const names = [...new Set(parsed.data.map((i) => i.category))];
  const { data: existing } = await ctx.supabase.from("menu_categories").select("id, name").eq("restaurant_id", rid);
  const missing = names.filter((n) => !existing?.some((c) => c.name.toLowerCase() === n.toLowerCase()));
  let cats = existing ?? [];
  if (missing.length) {
    const { data: created, error } = await ctx.supabase
      .from("menu_categories")
      .insert(missing.map((name, i) => ({ restaurant_id: rid, name, position: cats.length + i })))
      .select("id, name");
    if (error) return { ok: false, error: friendlyError(error) };
    cats = [...cats, ...(created ?? [])];
  }
  const rows = parsed.data.map((i, idx) => ({
    restaurant_id: rid,
    name: i.name,
    price: i.price,
    position: idx,
    category_id: cats.find((c) => c.name.toLowerCase() === i.category.toLowerCase())?.id ?? null,
  }));
  const { error } = await ctx.supabase.from("menu_items").insert(rows);
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/menu");
  return { ok: true, data: { count: rows.length } };
}

const quickInventorySchema = z.array(inventoryItemSchema.pick({ name: true, unit: true, min_quantity: true, unit_cost: true }).extend({
  quantity: z.coerce.number().min(0).max(1e9),
})).min(1).max(100);

export async function addInventoryItemsAction(input: unknown): Promise<ActionResult<{ count: number }>> {
  const ctx = await actionContext("inventory", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const parsed = quickInventorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Each item needs a name, unit and valid numbers." };
  const rid = ctx.ws.restaurant.id;
  const { data, error } = await ctx.supabase
    .from("inventory_items")
    .insert(parsed.data.map(({ quantity: _q, ...i }) => { void _q; return { ...i, restaurant_id: rid, quantity: 0 }; }))
    .select("id, name");
  if (error || !data) return { ok: false, error: friendlyError(error) };
  const movements = parsed.data
    .map((i) => ({ i, row: data.find((d) => d.name === i.name) }))
    .filter(({ i, row }) => row && i.quantity > 0)
    .map(({ i, row }) => ({ restaurant_id: rid, inventory_item_id: row!.id, type: "initial", quantity_delta: i.quantity, unit_cost: i.unit_cost, reason: "Opening stock" }));
  if (movements.length) {
    const { error: mErr } = await ctx.supabase.from("inventory_movements").insert(movements);
    if (mErr) return { ok: false, error: friendlyError(mErr) };
  }
  revalidatePath("/inventory");
  return { ok: true, data: { count: data.length } };
}

export async function inviteMembersAction(input: unknown): Promise<ActionResult<{ links: { email: string; url: string }[] }>> {
  const ctx = await actionContext("team", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const parsed = z.array(inviteSchema).min(1).max(30).safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the email addresses." };
  const { data, error } = await ctx.supabase
    .from("invitations")
    .insert(parsed.data.map((i) => ({ ...i, email: i.email.toLowerCase(), restaurant_id: ctx.ws.restaurant.id, invited_by: ctx.ws.user.id })))
    .select("email, token");
  if (error || !data) return { ok: false, error: friendlyError(error) };
  const { env } = await import("@/lib/env");
  revalidatePath("/settings");
  return { ok: true, data: { links: data.map((d) => ({ email: d.email, url: `${env.siteUrl}/invite/${d.token}` })) } };
}

export async function applyDashboardPresetAction(preset: PresetKey): Promise<ActionResult> {
  const ctx = await actionContext("overview", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const def = DASHBOARD_PRESETS[preset];
  if (!def) return { ok: false, error: "Unknown layout" };
  const { error } = await ctx.supabase
    .from("dashboard_layouts")
    .update({ widgets: def.widgets, name: def.name })
    .eq("restaurant_id", ctx.ws.restaurant.id)
    .eq("is_active", true);
  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true };
}

export async function setOnboardingStepAction(step: number, complete = false): Promise<ActionResult> {
  const ctx = await actionContext("settings", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const patch: Record<string, unknown> = { onboarding_step: Math.min(Math.max(step, 2), 11) };
  if (complete) patch.onboarding_completed_at = new Date().toISOString();
  const { error } = await ctx.supabase.from("restaurants").update(patch).eq("id", ctx.ws.restaurant.id);
  if (error) return { ok: false, error: friendlyError(error) };
  if (complete) revalidatePath("/", "layout");
  return { ok: true };
}
