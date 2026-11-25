import { Suspense } from "react";
import { addDays, format, parseISO } from "date-fns";
import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { resolveRange, zonedToUtc } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { TeamView } from "@/components/team/team-view";
import { planAllows } from "@/lib/billing";

export const metadata = { title: "Equipe" };

export default async function TeamPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ws = await requireWorkspace("team");
  const params = await searchParams;
  const tz = ws.restaurant.timezone;
  const range = resolveRange(tz, params.range ?? "7d", params.from, params.to);
  const from = zonedToUtc(`${range.from}T00:00`, tz).toISOString();
  const to = zonedToUtc(`${format(addDays(parseISO(range.to), 1), "yyyy-MM-dd")}T00:00`, tz).toISOString();
  const supabase = await createClient();
  const rid = ws.restaurant.id;

  const [{ data: hours }, { data: perf }, { data: entries }, { data: employees }] = await Promise.all([
    supabase.rpc("team_hours", { p_restaurant: rid, p_from: from, p_to: to }),
    ws.permissions.orders.view ? supabase.rpc("staff_performance", { p_restaurant: rid, p_from: from, p_to: to }) : Promise.resolve({ data: [] }),
    supabase.from("time_entries").select("id, employee_id, clock_in, clock_out, clock_in_photo, clock_out_photo, employees(full_name)").eq("restaurant_id", rid).lt("clock_in", to).or(`clock_out.is.null,clock_out.gt.${from}`).order("clock_in", { ascending: false }).limit(300),
    supabase.from("employees").select("id, full_name, position, role, member_id").eq("restaurant_id", rid).neq("status", "inactive").order("full_name"),
  ]);

  // Short-lived links to the selfies (private bucket).
  const photoPaths = (entries ?? []).flatMap((e) => [e.clock_in_photo, e.clock_out_photo]).filter((p): p is string => !!p);
  const { data: signed } = photoPaths.length ? await supabase.storage.from("timeclock").createSignedUrls(photoPaths, 3600) : { data: [] };
  const photoUrl = new Map((signed ?? []).filter((x) => x.signedUrl).map((x) => [x.path, x.signedUrl] as const));

  return (
    <div>
      <PageHeader title="Equipe" description="Quem está trabalhando, horas de cada um e o desempenho de quem atende." actions={<Suspense><DateRangePicker range={range} /></Suspense>} />
      <TeamView
        rangeLabel={range.label}
        hours={(hours ?? []) as { employee_id: string; full_name: string; job_title: string | null; member_id: string | null; minutes: number; entries: number; on_shift_since: string | null }[]}
        perf={(perf ?? []) as { user_id: string; full_name: string; orders: number; completed: number; cancelled: number; revenue: number; items: number; tables: number; tabs_closed: number; last_order_at: string | null }[]}
        entries={(entries ?? []).map((e) => ({ id: e.id, employee_id: e.employee_id, clock_in: e.clock_in, clock_out: e.clock_out, inPhoto: e.clock_in_photo ? photoUrl.get(e.clock_in_photo) ?? null : null, outPhoto: e.clock_out_photo ? photoUrl.get(e.clock_out_photo) ?? null : null, name: (e.employees as unknown as { full_name: string } | null)?.full_name ?? "—" }))}
        employees={(employees ?? []) as { id: string; full_name: string; position: string | null }[]}
        canEdit={ws.permissions.team.edit}
        requireSelfie={ws.settings.require_selfie !== false}
        showPerformance={ws.permissions.orders.view}
        performanceLocked={!planAllows(ws.restaurant.plan, "staff_performance")}
        currency={ws.restaurant.currency}
        locale={ws.restaurant.locale}
        timezone={tz}
      />
    </div>
  );
}
