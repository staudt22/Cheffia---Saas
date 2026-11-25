"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionContext } from "@/lib/workspace";
import { zonedToUtc } from "@/lib/dates";
import { friendlyError } from "@/lib/utils";
import type { ActionResult } from "@/lib/types";

const local = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Data e hora inválidas");

export async function saveTimeEntryAction(id: string | null, input: unknown): Promise<ActionResult> {
  const ctx = await actionContext("team", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const parsed = z.object({ employee_id: z.string().uuid(), clock_in: local, clock_out: local.or(z.literal("")).optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const tz = ctx.ws.restaurant.timezone;
  const clockIn = zonedToUtc(parsed.data.clock_in, tz);
  const clockOut = parsed.data.clock_out ? zonedToUtc(parsed.data.clock_out, tz) : null;
  if (clockOut && clockOut <= clockIn) return { ok: false, error: "A saída precisa ser depois da entrada." };
  const row = { employee_id: parsed.data.employee_id, clock_in: clockIn.toISOString(), clock_out: clockOut?.toISOString() ?? null, restaurant_id: ctx.ws.restaurant.id };
  const { error } = id
    ? await ctx.supabase.from("time_entries").update(row).eq("id", id).eq("restaurant_id", ctx.ws.restaurant.id)
    : await ctx.supabase.from("time_entries").insert(row);
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/team");
  return { ok: true };
}

export async function deleteTimeEntryAction(id: string): Promise<ActionResult> {
  const ctx = await actionContext("team", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const { error } = await ctx.supabase.from("time_entries").delete().eq("id", id).eq("restaurant_id", ctx.ws.restaurant.id);
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/team");
  return { ok: true };
}

export async function setRequireSelfieAction(value: boolean): Promise<ActionResult> {
  const ctx = await actionContext("team", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const { error } = await ctx.supabase.from("restaurant_settings").update({ require_selfie: value }).eq("restaurant_id", ctx.ws.restaurant.id);
  if (error) return { ok: false, error: error.message?.includes("require_selfie") ? "Rode a atualização 4 do banco no Supabase para ativar esta opção." : friendlyError(error) };
  revalidatePath("/team");
  revalidatePath("/minha-area");
  return { ok: true };
}
