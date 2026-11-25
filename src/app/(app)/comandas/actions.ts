"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionContext } from "@/lib/workspace";
import { friendlyError } from "@/lib/utils";
import type { ActionResult } from "@/lib/types";

const uuid = z.string().uuid();
function refresh() {
  revalidatePath("/comandas");
  revalidatePath("/orders");
  revalidatePath("/orders/kitchen");
  revalidatePath("/dashboard");
}

export async function openTabAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const ctx = await actionContext("orders", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const parsed = z.object({
    label: z.string().trim().min(1, "Informe a mesa ou o número da comanda").max(40),
    customer_name: z.string().trim().max(120).optional().transform((v) => v || null),
    guests: z.coerce.number().int().min(1).max(200).optional().nullable(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { data, error } = await ctx.supabase.from("tabs").insert({ ...parsed.data, restaurant_id: ctx.ws.restaurant.id }).select("id").single();
  if (error || !data) return { ok: false, error: friendlyError(error) };
  refresh();
  return { ok: true, data: { id: data.id } };
}

const itemsSchema = z.array(z.object({
  menu_item_id: uuid,
  quantity: z.coerce.number().int().min(1).max(99),
  modifiers: z.string().trim().max(200).optional().transform((v) => v || null),
})).min(1, "Adicione pelo menos um item");

export async function addToTabAction(tabId: string, items: unknown, notes?: string): Promise<ActionResult> {
  const ctx = await actionContext("orders", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const parsed = itemsSchema.safeParse(items);
  if (!uuid.safeParse(tabId).success || !parsed.success) return { ok: false, error: parsed.error?.issues[0]?.message ?? "Comanda inválida" };
  const { error } = await ctx.supabase.rpc("add_to_tab", { p_tab: tabId, p_items: parsed.data, p_notes: notes?.trim() || null });
  if (error) return { ok: false, error: friendlyError(error, "Não foi possível enviar para a cozinha.") };
  refresh();
  return { ok: true };
}

export async function closeTabAction(tabId: string, paymentMethod: string, serviceFeePct: number): Promise<ActionResult> {
  const ctx = await actionContext("orders", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (!uuid.safeParse(tabId).success || !z.number().min(0).max(30).safeParse(serviceFeePct).success) return { ok: false, error: "Dados inválidos" };
  const { error } = await ctx.supabase.rpc("close_tab", { p_tab: tabId, p_payment_method: paymentMethod, p_service_fee_pct: serviceFeePct });
  if (error) return { ok: false, error: friendlyError(error, "Não foi possível fechar a comanda.") };
  refresh();
  return { ok: true };
}

export async function cancelTabAction(tabId: string): Promise<ActionResult> {
  const ctx = await actionContext("orders", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const { error } = await ctx.supabase.rpc("cancel_tab", { p_tab: tabId });
  if (error) return { ok: false, error: friendlyError(error) };
  refresh();
  return { ok: true };
}
