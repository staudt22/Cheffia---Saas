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
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Configuração inválida" };
  const { error } = await ctx.supabase.from("restaurant_settings").update(parsed.data).eq("restaurant_id", ctx.ws.restaurant.id);
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/", "layout");
  return { ok: true };
}

const sectionEnum = z.enum(SECTIONS.map((s) => s.key) as [string, ...string[]]);
/** A role is either built-in ("base:manager") or custom ("custom:<uuid>"). */
const roleRef = z.union([
  z.string().regex(/^base:(manager|employee|accountant|kitchen)$/),
  z.string().regex(/^custom:[0-9a-f-]{36}$/i),
]);

async function ownerContext() {
  const ctx = await actionContext("settings", "view");
  if ("error" in ctx) return { error: ctx.error! } as const;
  if (ctx.ws.role !== "owner") return { error: "Só o dono pode mexer nos cargos." } as const;
  return ctx;
}

export async function updatePermissionAction(input: unknown): Promise<ActionResult> {
  const ctx = await ownerContext();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const parsed = z.object({ role: roleRef, section: sectionEnum, level: z.enum(["none", "view", "edit"]) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Permissão inválida" };
  const { role, section, level } = parsed.data;
  const values = { can_view: level !== "none", can_edit: level === "edit" };
  const rid = ctx.ws.restaurant.id;
  const [kind, id] = role.split(":") as ["base" | "custom", string];
  const { error } = kind === "base"
    ? await ctx.supabase.from("role_permissions").update(values).eq("restaurant_id", rid).eq("role", id).eq("section", section)
    : await ctx.supabase.from("custom_role_permissions").upsert({ custom_role_id: id, restaurant_id: rid, section, ...values }, { onConflict: "custom_role_id,section" });
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/settings");
  return { ok: true };
}

export async function createCustomRoleAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const ctx = await ownerContext();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const parsed = z.object({
    name: z.string().trim().min(1, "Dê um nome ao cargo").max(40, "Use até 40 letras"),
    description: z.string().trim().max(200).optional().transform((v) => v || null),
    copyFrom: roleRef.or(z.literal("none")),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const rid = ctx.ws.restaurant.id;
  const { data: created, error } = await ctx.supabase.from("custom_roles").insert({ restaurant_id: rid, name: parsed.data.name, description: parsed.data.description }).select("id").single();
  if (error || !created) return { ok: false, error: error?.code === "23505" ? "Já existe um cargo com esse nome." : friendlyError(error) };

  let base: { section: string; can_view: boolean; can_edit: boolean }[] = [];
  if (parsed.data.copyFrom !== "none") {
    const [kind, id] = parsed.data.copyFrom.split(":");
    const { data } = kind === "base"
      ? await ctx.supabase.from("role_permissions").select("section, can_view, can_edit").eq("restaurant_id", rid).eq("role", id!)
      : await ctx.supabase.from("custom_role_permissions").select("section, can_view, can_edit").eq("custom_role_id", id!);
    base = data ?? [];
  }
  const rows = SECTIONS.map((s) => {
    const b = base.find((x) => x.section === s.key);
    return { custom_role_id: created.id, restaurant_id: rid, section: s.key, can_view: b?.can_view ?? false, can_edit: b?.can_edit ?? false };
  });
  const { error: pErr } = await ctx.supabase.from("custom_role_permissions").insert(rows);
  if (pErr) return { ok: false, error: friendlyError(pErr) };
  revalidatePath("/settings");
  return { ok: true, data: { id: created.id } };
}

export async function updateCustomRoleAction(id: string, input: unknown): Promise<ActionResult> {
  const ctx = await ownerContext();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const parsed = z.object({ name: z.string().trim().min(1, "Dê um nome ao cargo").max(40), description: z.string().trim().max(200).optional().transform((v) => v || null) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { error } = await ctx.supabase.from("custom_roles").update(parsed.data).eq("id", id).eq("restaurant_id", ctx.ws.restaurant.id);
  if (error) return { ok: false, error: error.code === "23505" ? "Já existe um cargo com esse nome." : friendlyError(error) };
  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteCustomRoleAction(id: string): Promise<ActionResult> {
  const ctx = await ownerContext();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const { error } = await ctx.supabase.from("custom_roles").delete().eq("id", id).eq("restaurant_id", ctx.ws.restaurant.id);
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/settings");
  return { ok: true };
}

export async function updateMemberRoleAction(memberId: string, role: string): Promise<ActionResult> {
  const ctx = await actionContext("team", "view");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (!z.string().uuid().safeParse(memberId).success || !roleRef.safeParse(role).success) return { ok: false, error: "Cargo inválido" };
  const [kind, id] = role.split(":");
  const { error } = await ctx.supabase.rpc("set_member_role", {
    p_member: memberId,
    p_role: kind === "base" ? id : "employee",
    p_custom_role: kind === "custom" ? id : null,
  });
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
