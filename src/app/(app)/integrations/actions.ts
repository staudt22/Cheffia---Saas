"use server";

import { revalidatePath } from "next/cache";
import { actionContext } from "@/lib/workspace";
import { providerInfo } from "@/lib/integrations/registry";
import { friendlyError } from "@/lib/utils";
import type { ActionResult } from "@/lib/types";

export async function setDemoModeAction(providerKey: string, enabled: boolean): Promise<ActionResult> {
  const ctx = await actionContext("integrations", "edit");
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const p = providerInfo(providerKey);
  if (!p?.supportsDemo) return { ok: false, error: "Demo mode isn't available for this platform." };
  const { error } = await ctx.supabase.from("integrations").upsert(
    { restaurant_id: ctx.ws.restaurant.id, provider: p.key, status: enabled ? "demo" : "disconnected", connected_at: null, last_error: null },
    { onConflict: "restaurant_id,provider" },
  );
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/integrations");
  return { ok: true };
}
