import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { resolveRange } from "@/lib/dates";
import { planAllows } from "@/lib/billing";
import { AllUnits } from "@/components/team/all-units";

export const metadata = { title: "Todas as unidades" };

export default async function AllUnitsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ws = await requireWorkspace("overview");
  const params = await searchParams;
  if (!planAllows(ws.restaurant.plan, "all_units")) redirect("/upgrade?area=%2Funidades");
  const supabase = await createClient();
  const range = resolveRange(ws.restaurant.timezone, params.range ?? "month", params.from, params.to);
  const units = await Promise.all(ws.memberships.map(async (m) => {
    const [cur, prev] = await Promise.all([
      supabase.rpc("period_totals", { p_restaurant: m.restaurant_id, p_from: range.from, p_to: range.to }).single(),
      supabase.rpc("period_totals", { p_restaurant: m.restaurant_id, p_from: range.prevFrom, p_to: range.prevTo }).single(),
    ]);
    const c = (cur.data ?? {}) as Record<string, number>, p = (prev.data ?? {}) as Record<string, number>;
    return { id: m.restaurant_id, name: m.name, logo: m.logo_url, role: m.role, revenue: Number(c.revenue ?? 0), expenses: Number(c.expenses ?? 0), orders: Number(c.orders ?? 0), prevRevenue: Number(p.revenue ?? 0), current: m.restaurant_id === ws.restaurant.id };
  }));
  return <AllUnits units={units} range={range} currency={ws.restaurant.currency} locale={ws.restaurant.locale} />;
}
