"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionContext } from "@/lib/workspace";
import { SECTIONS } from "@/lib/permissions";
import { friendlyError } from "@/lib/utils";
import type { ActionResult } from "@/lib/types";

const settingsSchema = z.object({
  inventory_auto_deduct: z.boolean(),
  default_prep_minutes: z.coerce.number().int().min(1).max(240),
  tax_rate: z.coerce.number().min(0).max(99.999),
  notifications: z.record(z.string(), z.boolean()),
}).partial();

export async function updateSettingsAction(input: unknown): Promise<ActionResult> {
  const ctx = await actionContext("settings", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid settings" };
  const { error } = await ctx.supabase.from("restaurant_settings").update(parsed.data).eq("restaurant_id", ctx.ws.restaurant.id);
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/", "layout");
  return { ok: true };
}

const permSchema = z.object({
  role: z.enum(["manager", "employee", "accountant", "kitchen"]),
  section: z.enum(SECTIONS.map((s) => s.key) as [string, ...string[]]),
  can_view: z.boolean(),
  can_edit: z.boolean(),
});

export async function updatePermissionAction(input: unknown): Promise<ActionResult> {
  const ctx = await actionContext("settings", "view");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (ctx.ws.role !== "owner") return { ok: false, error: "Only the owner can change permissions." };
  const parsed = permSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid permission" };
  const p = parsed.data;
  const { error } = await ctx.supabase.from("role_permissions")
    .update({ can_view: p.can_view || p.can_edit, can_edit: p.can_edit })
    .eq("restaurant_id", ctx.ws.restaurant.id).eq("role", p.role).eq("section", p.section);
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/settings");
  return { ok: true };
}

export async function updateMemberRoleAction(memberId: string, role: string): Promise<ActionResult> {
  const ctx = await actionContext("team", "view");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const parsed = z.object({ memberId: z.string().uuid(), role: z.enum(["manager", "employee", "accountant", "kitchen"]) }).safeParse({ memberId, role });
  if (!parsed.success) return { ok: false, error: "Invalid role" };
  const { error } = await ctx.supabase.rpc("update_member_role", { p_member: memberId, p_role: role });
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/settings");
  return { ok: true };
}

export async function removeMemberAction(memberId: string): Promise<ActionResult> {
  const ctx = await actionContext("team", "view");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const { error } = await ctx.supabase.rpc("remove_member", { p_member: memberId });
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/settings");
  return { ok: true };
}

export async function revokeInvitationAction(id: string): Promise<ActionResult> {
  const ctx = await actionContext("team", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const { error } = await ctx.supabase.from("invitations").delete().eq("id", id).eq("restaurant_id", ctx.ws.restaurant.id);
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/settings");
  return { ok: true };
}
