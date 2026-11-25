"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_RESTAURANT_COOKIE } from "@/lib/workspace";

/** Ends the session (clears the Supabase auth cookies) and goes to the login page. */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const store = await cookies();
  store.delete(ACTIVE_RESTAURANT_COOKIE);
  // Belt and braces: remove any leftover Supabase auth cookie chunks.
  for (const c of store.getAll()) if (c.name.startsWith("sb-") && c.name.includes("auth-token")) store.delete(c.name);
  redirect("/login");
}
