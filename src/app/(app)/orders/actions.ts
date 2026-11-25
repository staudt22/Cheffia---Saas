"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionContext } from "@/lib/workspace";
import { orderSchema } from "@/lib/validation";
import { friendlyError } from "@/lib/utils";
import { providerInfo } from "@/lib/integrations/registry";
import type { ActionResult, OrderStatus } from "@/lib/types";

function refresh() {
  revalidatePath("/orders");
  revalidatePath("/orders/kitchen");
  revalidatePath("/dashboard");
}

export async function createOrderAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const ctx = await actionContext("orders", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the order details." };
  const o = parsed.data;
  const { data, error } = await ctx.supabase.rpc("create_order", {
    p_restaurant: ctx.ws.restaurant.id,
    p_items: o.items,
    p_source: "manual",
    p_fulfillment: o.fulfillment,
    p_customer_name: o.customer_name,
    p_customer_phone: o.customer_phone,
    p_table_label: o.table_label,
    p_notes: o.notes,
    p_discount: o.discount,
    p_delivery_fee: o.fulfillment === "delivery" ? o.delivery_fee : 0,
    p_payment_method: o.payment_method,
    p_status: o.status,
  });
  if (error || !data) return { ok: false, error: friendlyError(error, "The order could not be created.") };
  refresh();
  return { ok: true, data: { id: data as string } };
}

const statusSchema = z.enum(["new", "accepted", "preparing", "ready", "completed", "cancelled"]);

export async function updateOrderStatusAction(orderId: string, status: OrderStatus): Promise<ActionResult> {
  const ctx = await actionContext("orders", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (!z.string().uuid().safeParse(orderId).success || !statusSchema.safeParse(status).success) return { ok: false, error: "Invalid request" };
  const { data, error } = await ctx.supabase
    .from("orders").update({ status }).eq("id", orderId).eq("restaurant_id", ctx.ws.restaurant.id).select("id");
  if (error) return { ok: false, error: friendlyError(error) };
  if (!data?.length) return { ok: false, error: "Order not found" };
  refresh();
  return { ok: true };
}

/**
 * Demo mode only: creates an order that is explicitly flagged as simulated,
 * so owners can see how platform orders will flow before a real connection exists.
 */
export async function simulateOrderAction(providerKey: string): Promise<ActionResult> {
  const ctx = await actionContext("orders", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const provider = providerInfo(providerKey);
  if (!provider?.supportsDemo || !provider.orderSource) return { ok: false, error: "Demo mode isn't available for this platform." };
  const rid = ctx.ws.restaurant.id;
  const { data: menu } = await ctx.supabase.from("menu_items").select("id").eq("restaurant_id", rid).eq("is_available", true).limit(30);
  if (!menu?.length) return { ok: false, error: "Add at least one available menu item first." };
  const picks = [...menu].sort(() => Math.random() - 0.5).slice(0, Math.min(menu.length, 1 + Math.floor(Math.random() * 3)));
  const names = ["Alex P.", "Bruna S.", "Chris M.", "Dana K.", "Eli R.", "Fernanda L."];
  const { data: id, error } = await ctx.supabase.rpc("create_order", {
    p_restaurant: rid,
    p_items: picks.map((m) => ({ menu_item_id: m.id, quantity: 1 })),
    p_source: provider.orderSource,
    p_fulfillment: "delivery",
    p_customer_name: names[Math.floor(Math.random() * names.length)],
    p_notes: `Simulated ${provider.name} order (demo mode)`,
  });
  if (error || !id) return { ok: false, error: friendlyError(error) };
  await ctx.supabase.from("orders").update({ is_simulated: true }).eq("id", id);
  await ctx.supabase.from("integrations").upsert(
    { restaurant_id: rid, provider: provider.key, status: "demo", last_sync_at: new Date().toISOString() },
    { onConflict: "restaurant_id,provider" },
  );
  refresh();
  revalidatePath("/integrations");
  return { ok: true, message: `Simulated ${provider.name} order created` };
}
