"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionContext } from "@/lib/workspace";
import { inventoryItemSchema } from "@/lib/validation";
import { friendlyError } from "@/lib/utils";
import type { ActionResult } from "@/lib/types";

const uuid = z.string().uuid();
function refresh() { revalidatePath("/inventory"); revalidatePath("/dashboard"); revalidatePath("/menu"); }

export async function saveInventoryItemAction(id: string | null, input: unknown, initialQuantity?: number): Promise<ActionResult<{ id: string }>> {
  const ctx = await actionContext("inventory", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const parsed = inventoryItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the item details." };
  const rid = ctx.ws.restaurant.id;
  const row = { ...parsed.data, supplier_id: parsed.data.supplier_id || null, restaurant_id: rid };
  const { data, error } = id
    ? await ctx.supabase.from("inventory_items").update(row).eq("id", id).eq("restaurant_id", rid).select("id").single()
    : await ctx.supabase.from("inventory_items").insert({ ...row, quantity: 0 }).select("id").single();
  if (error || !data) return { ok: false, error: friendlyError(error) };
  if (!id && initialQuantity && initialQuantity > 0) {
    const { error: mErr } = await ctx.supabase.from("inventory_movements").insert({
      restaurant_id: rid, inventory_item_id: data.id, type: "initial", quantity_delta: initialQuantity, unit_cost: row.unit_cost, reason: "Opening stock",
    });
    if (mErr) return { ok: false, error: friendlyError(mErr) };
  }
  refresh();
  return { ok: true, data: { id: data.id } };
}

export async function deleteInventoryItemAction(id: string): Promise<ActionResult> {
  const ctx = await actionContext("inventory", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (!uuid.safeParse(id).success) return { ok: false, error: "Invalid item" };
  const { error } = await ctx.supabase.from("inventory_items").delete().eq("id", id).eq("restaurant_id", ctx.ws.restaurant.id);
  if (error) return { ok: false, error: error.code === "23503" ? "This item is used in a recipe or purchase order. Remove it there first." : friendlyError(error) };
  refresh();
  return { ok: true };
}

const movementSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("purchase"), quantity: z.coerce.number().positive(), unit_cost: z.coerce.number().min(0).optional(), reason: z.string().max(200).optional() }),
  z.object({ type: z.literal("usage"), quantity: z.coerce.number().positive(), reason: z.string().max(200).optional() }),
  z.object({ type: z.literal("waste"), quantity: z.coerce.number().positive(), reason: z.string().trim().min(1, "Say why it was wasted").max(200) }),
  z.object({ type: z.literal("adjustment"), counted: z.coerce.number().min(0), reason: z.string().max(200).optional() }),
]);

export async function recordMovementAction(itemId: string, input: unknown): Promise<ActionResult> {
  const ctx = await actionContext("inventory", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (!uuid.safeParse(itemId).success) return { ok: false, error: "Invalid item" };
  const parsed = movementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter a valid quantity." };
  const rid = ctx.ws.restaurant.id;
  const { data: item } = await ctx.supabase.from("inventory_items").select("quantity").eq("id", itemId).eq("restaurant_id", rid).maybeSingle();
  if (!item) return { ok: false, error: "Item not found" };
  const m = parsed.data;
  let delta: number;
  let unitCost: number | null = null;
  switch (m.type) {
    case "purchase": delta = m.quantity; unitCost = m.unit_cost ?? null; break;
    case "usage": case "waste": delta = -m.quantity; break;
    case "adjustment": delta = Math.round((m.counted - Number(item.quantity)) * 1000) / 1000; break;
  }
  if (delta === 0) return { ok: true, message: "Count matches — nothing to adjust." };
  const { error } = await ctx.supabase.from("inventory_movements").insert({
    restaurant_id: rid, inventory_item_id: itemId, type: m.type, quantity_delta: delta, unit_cost: unitCost,
    reason: m.reason?.trim() || (m.type === "adjustment" ? `Stock count: ${m.counted}` : null),
  });
  if (error) return { ok: false, error: friendlyError(error) };
  refresh();
  return { ok: true };
}
