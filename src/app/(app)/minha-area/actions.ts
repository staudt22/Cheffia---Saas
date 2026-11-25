"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { friendlyError } from "@/lib/utils";
import type { ActionResult } from "@/lib/types";

/** Clock in or out (whichever applies) for the signed-in member. */
export async function clockAction(): Promise<ActionResult<{ status: "in" | "out" }>> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false, error: "Sua sessão expirou. Entre novamente." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("clock_toggle", { p_restaurant: ws.restaurant.id });
  if (error) return { ok: false, error: friendlyError(error, "Não foi possível registrar o ponto.") };
  revalidatePath("/minha-area");
  revalidatePath("/team");
  revalidatePath("/dashboard");
  return { ok: true, data: { status: (data as { status: "in" | "out" }).status } };
}
