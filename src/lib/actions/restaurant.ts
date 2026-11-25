"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { actionContext, ACTIVE_RESTAURANT_COOKIE } from "@/lib/workspace";
import { restaurantUpdateSchema } from "@/lib/validation";
import { friendlyError } from "@/lib/utils";
import type { ActionResult } from "@/lib/types";

function ownsStorageUrl(url: string | null | undefined, restaurantId: string) {
  if (!url) return true;
  return url.startsWith(`${env.supabaseUrl}/storage/v1/object/public/branding/${restaurantId}/`);
}

export async function updateRestaurant(input: unknown): Promise<ActionResult> {
  const ctx = await actionContext("settings", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const parsed = restaurantUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Valores inválidos" };
  const values = parsed.data;
  if (!ownsStorageUrl(values.logo_url, ctx.ws.restaurant.id) || !ownsStorageUrl(values.cover_url, ctx.ws.restaurant.id)) {
    return { ok: false, error: "As imagens precisam ser enviadas pelo CheffeData." };
  }
  const { error } = await ctx.supabase.from("restaurants").update(values).eq("id", ctx.ws.restaurant.id);
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function switchRestaurant(restaurantId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data } = await supabase.from("restaurants").select("id").eq("id", restaurantId).maybeSingle();
  if (!data) return { ok: false, error: "Restaurante não encontrado" };
  const store = await cookies();
  store.set(ACTIVE_RESTAURANT_COOKIE, restaurantId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  const { data: u } = await supabase.auth.getUser();
  if (u.user) await supabase.from("profiles").update({ last_restaurant_id: restaurantId }).eq("id", u.user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}
