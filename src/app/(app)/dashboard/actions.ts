"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionContext } from "@/lib/workspace";
import { DASHBOARD_PRESETS, WIDGETS } from "@/lib/dashboard/widgets";
import { friendlyError } from "@/lib/utils";
import type { ActionResult } from "@/lib/types";

const widgetSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.enum(WIDGETS.map((w) => w.type) as [string, ...string[]]),
  size: z.enum(["sm", "md", "lg", "xl"]),
  config: z.object({ chart: z.enum(["area", "bar", "line"]).optional(), bucket: z.enum(["hour", "day", "week", "month"]).optional() }).optional(),
});
const layoutSchema = z.object({
  widgets: z.array(widgetSchema).max(40),
  density: z.enum(["compact", "comfortable"]),
});

export async function saveLayoutAction(layoutId: string, input: unknown): Promise<ActionResult> {
  const ctx = await actionContext("overview", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const parsed = layoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "This layout contains invalid widgets." };
  const { error } = await ctx.supabase.from("dashboard_layouts").update(parsed.data).eq("id", layoutId).eq("restaurant_id", ctx.ws.restaurant.id);
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function createLayoutAction(name: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const ctx = await actionContext("overview", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const parsed = layoutSchema.safeParse(input);
  const cleanName = name.trim().slice(0, 60);
  if (!parsed.success || !cleanName) return { ok: false, error: "Give the layout a name." };
  const rid = ctx.ws.restaurant.id;
  await ctx.supabase.from("dashboard_layouts").update({ is_active: false }).eq("restaurant_id", rid).eq("is_active", true);
  const { data, error } = await ctx.supabase
    .from("dashboard_layouts")
    .insert({ restaurant_id: rid, name: cleanName, is_active: true, created_by: ctx.ws.user.id, ...parsed.data })
    .select("id").single();
  if (error || !data) return { ok: false, error: friendlyError(error) };
  revalidatePath("/dashboard");
  return { ok: true, data: { id: data.id } };
}

export async function activateLayoutAction(layoutId: string): Promise<ActionResult> {
  const ctx = await actionContext("overview", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const rid = ctx.ws.restaurant.id;
  const { data: target } = await ctx.supabase.from("dashboard_layouts").select("id").eq("id", layoutId).eq("restaurant_id", rid).maybeSingle();
  if (!target) return { ok: false, error: "Layout not found" };
  await ctx.supabase.from("dashboard_layouts").update({ is_active: false }).eq("restaurant_id", rid).eq("is_active", true);
  const { error } = await ctx.supabase.from("dashboard_layouts").update({ is_active: true }).eq("id", layoutId);
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteLayoutAction(layoutId: string): Promise<ActionResult> {
  const ctx = await actionContext("overview", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const rid = ctx.ws.restaurant.id;
  const { data: layouts } = await ctx.supabase.from("dashboard_layouts").select("id, is_active").eq("restaurant_id", rid).order("created_at");
  if (!layouts || layouts.length <= 1) return { ok: false, error: "You need at least one layout." };
  const target = layouts.find((l) => l.id === layoutId);
  if (!target) return { ok: false, error: "Layout not found" };
  const { error } = await ctx.supabase.from("dashboard_layouts").delete().eq("id", layoutId);
  if (error) return { ok: false, error: friendlyError(error) };
  if (target.is_active) {
    const next = layouts.find((l) => l.id !== layoutId)!;
    await ctx.supabase.from("dashboard_layouts").update({ is_active: true }).eq("id", next.id);
  }
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function resetLayoutAction(layoutId: string): Promise<ActionResult> {
  return saveLayoutAction(layoutId, { widgets: DASHBOARD_PRESETS.owner.widgets, density: "comfortable" });
}
