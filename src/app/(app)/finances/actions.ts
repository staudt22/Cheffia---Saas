"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addMonths, addWeeks, addYears, format, parseISO } from "date-fns";
import { actionContext } from "@/lib/workspace";
import { expenseSchema, revenueSchema } from "@/lib/validation";
import { friendlyError } from "@/lib/utils";
import type { ActionResult } from "@/lib/types";

const uuid = z.string().uuid();
function refresh() { revalidatePath("/finances"); revalidatePath("/dashboard"); }

function nextDue(date: string, recurrence: "weekly" | "monthly" | "yearly") {
  const d = parseISO(date);
  return format(recurrence === "weekly" ? addWeeks(d, 1) : recurrence === "monthly" ? addMonths(d, 1) : addYears(d, 1), "yyyy-MM-dd");
}

export async function saveExpenseAction(id: string | null, input: unknown): Promise<ActionResult> {
  const ctx = await actionContext("finances", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira a despesa." };
  const rid = ctx.ws.restaurant.id;
  const e = parsed.data;
  if (e.receipt_path && !e.receipt_path.startsWith(`${rid}/`)) return { ok: false, error: "Comprovante inválido" };
  const row = {
    ...e,
    supplier_id: e.supplier_id || null,
    recurrence: e.is_recurring ? e.recurrence : null,
    restaurant_id: rid,
  };
  let error;
  if (id) {
    const { data: existing } = await ctx.supabase.from("expenses").select("is_recurring, recurrence, next_due_on, date").eq("id", id).eq("restaurant_id", rid).maybeSingle();
    if (!existing) return { ok: false, error: "Despesa não encontrada" };
    const scheduleChanged = e.is_recurring && (!existing.is_recurring || existing.recurrence !== e.recurrence || existing.date !== e.date);
    ({ error } = await ctx.supabase.from("expenses").update({
      ...row,
      next_due_on: e.is_recurring ? (scheduleChanged ? nextDue(e.date, e.recurrence!) : existing.next_due_on) : null,
    }).eq("id", id).eq("restaurant_id", rid));
  } else {
    ({ error } = await ctx.supabase.from("expenses").insert({ ...row, next_due_on: e.is_recurring ? nextDue(e.date, e.recurrence!) : null }));
  }
  if (error) return { ok: false, error: friendlyError(error) };
  if (e.is_recurring) await ctx.supabase.rpc("generate_recurring_expenses", { p_restaurant: rid });
  refresh();
  return { ok: true };
}

export async function deleteExpenseAction(id: string): Promise<ActionResult> {
  const ctx = await actionContext("finances", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (!uuid.safeParse(id).success) return { ok: false, error: "Despesa inválida" };
  const rid = ctx.ws.restaurant.id;
  const { data } = await ctx.supabase.from("expenses").select("receipt_path").eq("id", id).eq("restaurant_id", rid).maybeSingle();
  const { error } = await ctx.supabase.from("expenses").delete().eq("id", id).eq("restaurant_id", rid);
  if (error) return { ok: false, error: friendlyError(error) };
  if (data?.receipt_path) await ctx.supabase.storage.from("receipts").remove([data.receipt_path]);
  refresh();
  return { ok: true };
}

export async function stopRecurringAction(id: string): Promise<ActionResult> {
  const ctx = await actionContext("finances", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const { error } = await ctx.supabase.from("expenses").update({ is_recurring: false, recurrence: null, next_due_on: null }).eq("id", id).eq("restaurant_id", ctx.ws.restaurant.id);
  if (error) return { ok: false, error: friendlyError(error) };
  refresh();
  return { ok: true };
}

export async function saveRevenueAction(id: string | null, input: unknown): Promise<ActionResult> {
  const ctx = await actionContext("finances", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const parsed = revenueSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira a receita." };
  const rid = ctx.ws.restaurant.id;
  const row = { ...parsed.data, restaurant_id: rid };
  const { error } = id
    ? await ctx.supabase.from("revenue_records").update(row).eq("id", id).eq("restaurant_id", rid).is("order_id", null)
    : await ctx.supabase.from("revenue_records").insert(row);
  if (error) return { ok: false, error: friendlyError(error) };
  refresh();
  return { ok: true };
}

export async function deleteRevenueAction(id: string): Promise<ActionResult> {
  const ctx = await actionContext("finances", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (!uuid.safeParse(id).success) return { ok: false, error: "Lançamento inválido" };
  const { data, error } = await ctx.supabase.from("revenue_records").delete().eq("id", id).eq("restaurant_id", ctx.ws.restaurant.id).is("order_id", null).select("id");
  if (error) return { ok: false, error: friendlyError(error) };
  if (!data?.length) return { ok: false, error: "A receita de pedidos é controlada pelo próprio pedido — cancele o pedido, se for o caso." };
  refresh();
  return { ok: true };
}

export async function receiptUrlAction(path: string): Promise<ActionResult<{ url: string }>> {
  const ctx = await actionContext("finances", "view");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (!path.startsWith(`${ctx.ws.restaurant.id}/`)) return { ok: false, error: "Comprovante não encontrado" };
  const { data, error } = await ctx.supabase.storage.from("receipts").createSignedUrl(path, 60 * 5);
  if (error || !data) return { ok: false, error: "Comprovante não encontrado" };
  return { ok: true, data: { url: data.signedUrl } };
}
