"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_RESTAURANT_COOKIE } from "@/lib/workspace";
import { friendlyError } from "@/lib/utils";
import type { ActionResult } from "@/lib/types";

export async function acceptInvitationAction(token: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error || !data) return { ok: false, error: friendlyError(error, "Não foi possível aceitar o convite.") };
  (await cookies()).set(ACTIVE_RESTAURANT_COOKIE, data as string, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return { ok: true };
}
