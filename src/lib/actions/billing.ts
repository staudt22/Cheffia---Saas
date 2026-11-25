"use server";

import { revalidatePath } from "next/cache";
import { getWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";
import type { ActionResult } from "@/lib/types";

/** Starts the one-time 7-day trial (owner only; enforced by the database). */
export async function startTrialAction(): Promise<ActionResult> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false, error: "Sua sessão expirou. Entre novamente." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_trial", { p_restaurant: ws.restaurant.id });
  if (error) return { ok: false, error: error.message?.includes("start_trial") ? "Rode a atualização 5 do banco no Supabase para ativar o teste." : friendlyError(error, "Não foi possível ativar o teste.") };
  revalidatePath("/", "layout");
  return { ok: true };
}
