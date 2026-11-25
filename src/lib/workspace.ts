import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildPermissionMap, homePath, type PermissionMap } from "@/lib/permissions";
import type { AppRole, Restaurant, RestaurantSettings, Section } from "@/lib/types";

export const ACTIVE_RESTAURANT_COOKIE = "forkly_rid";

export interface Workspace {
  user: { id: string; email: string; fullName: string };
  restaurant: Restaurant;
  settings: RestaurantSettings;
  role: AppRole;
  permissions: PermissionMap;
  memberships: { restaurant_id: string; role: AppRole; name: string; logo_url: string | null }[];
}

export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

/** Loads the signed-in user's active restaurant. Returns null if they have none yet. */
export const getWorkspace = cache(async (): Promise<Workspace | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("full_name, last_restaurant_id").eq("id", user.id).maybeSingle(),
    supabase
      .from("restaurant_members")
      .select("restaurant_id, role, restaurants(name, logo_url)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at"),
  ]);
  if (!memberships?.length) return null;

  const cookieStore = await cookies();
  const preferred = cookieStore.get(ACTIVE_RESTAURANT_COOKIE)?.value ?? profile?.last_restaurant_id;
  const active = memberships.find((m) => m.restaurant_id === preferred) ?? memberships[0]!;

  const [{ data: restaurant }, { data: settings }, { data: perms }] = await Promise.all([
    supabase.from("restaurants").select("*").eq("id", active.restaurant_id).single(),
    supabase.from("restaurant_settings").select("*").eq("restaurant_id", active.restaurant_id).single(),
    supabase.from("role_permissions").select("section, can_view, can_edit").eq("restaurant_id", active.restaurant_id).eq("role", active.role),
  ]);
  if (!restaurant || !settings) return null;

  const role = active.role as AppRole;
  return {
    user: { id: user.id, email: user.email ?? "", fullName: profile?.full_name ?? user.email ?? "" },
    restaurant: restaurant as Restaurant,
    settings: settings as RestaurantSettings,
    role,
    permissions: buildPermissionMap(role, perms ?? []),
    memberships: memberships.map((m) => {
      const r = m.restaurants as unknown as { name: string; logo_url: string | null } | null;
      return { restaurant_id: m.restaurant_id, role: m.role as AppRole, name: r?.name ?? "Restaurant", logo_url: r?.logo_url ?? null };
    }),
  };
});

/** For pages inside the app shell: guarantees a workspace and section access. */
export async function requireWorkspace(section?: Section, action: "view" | "edit" = "view") {
  const user = await getUser();
  if (!user) redirect("/login");
  const ws = await getWorkspace();
  if (!ws) redirect("/onboarding");
  if (section && !ws.permissions[section][action]) {
    const home = homePath(ws.permissions);
    redirect(home === "/dashboard" ? `/dashboard?denied=${section}` : home + (home.includes("?") ? "&" : "?") + `denied=${section}`);
  }
  return ws;
}

/** For server actions: returns the workspace + a client, or an error string. */
export async function actionContext(section: Section, action: "view" | "edit" = "edit") {
  const ws = await getWorkspace();
  if (!ws) return { error: "Your session has expired. Please sign in again." } as const;
  if (!ws.permissions[section][action]) return { error: "You don't have permission to do that." } as const;
  const supabase = await createClient();
  return { ws, supabase } as const;
}
