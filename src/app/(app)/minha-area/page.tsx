import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { todayIn, zonedToUtc } from "@/lib/dates";
import { MyArea } from "@/components/team/my-area";
import { lockedAreas } from "@/lib/billing";

export const metadata = { title: "Minha área" };

export default async function MyAreaPage() {
  const ws = await requireWorkspace();
  const supabase = await createClient();
  const tz = ws.restaurant.timezone;
  const today = todayIn(tz);
  const weekStart = format(startOfWeek(parseISO(today), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const dayStart = zonedToUtc(`${today}T00:00`, tz).toISOString();
  const dayEnd = zonedToUtc(`${format(addDays(parseISO(today), 1), "yyyy-MM-dd")}T00:00`, tz).toISOString();
  const weekStartUtc = zonedToUtc(`${weekStart}T00:00`, tz).toISOString();

  const { data: member } = await supabase.from("restaurant_members").select("id").eq("restaurant_id", ws.restaurant.id).eq("user_id", ws.user.id).maybeSingle();
  const { data: employee } = member ? await supabase.from("employees").select("id, full_name, position").eq("member_id", member.id).maybeSingle() : { data: null };
  const { data: entries } = employee
    ? await supabase.from("time_entries").select("id, clock_in, clock_out, clock_in_photo, clock_out_photo").eq("employee_id", employee.id).gte("clock_in", addDaysIso(weekStartUtc, -1)).order("clock_in", { ascending: false }).limit(60)
    : { data: [] };

  const canOrders = ws.permissions.orders.view;
  const [{ data: todayPerf }, { data: weekPerf }, { data: myTabs }, { data: myOrders }] = canOrders
    ? await Promise.all([
        supabase.rpc("staff_performance", { p_restaurant: ws.restaurant.id, p_from: dayStart, p_to: dayEnd }),
        supabase.rpc("staff_performance", { p_restaurant: ws.restaurant.id, p_from: weekStartUtc, p_to: dayEnd }),
        supabase.from("tabs").select("id, number, label, opened_at").eq("restaurant_id", ws.restaurant.id).eq("status", "open").eq("opened_by", ws.user.id).order("opened_at"),
        supabase.from("orders").select("id, number, status, total, table_label, created_at").eq("restaurant_id", ws.restaurant.id).eq("created_by", ws.user.id).gte("created_at", dayStart).order("created_at", { ascending: false }).limit(20),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const mine = (rows: unknown) => ((rows as { user_id: string }[] | null) ?? []).find((r) => r.user_id === ws.user.id) as Record<string, unknown> | undefined;

  return (
    <MyArea
      name={ws.user.fullName}
      roleName={ws.roleName}
      restaurantName={ws.restaurant.name}
      entries={(entries ?? []) as { id: string; clock_in: string; clock_out: string | null; clock_in_photo: string | null; clock_out_photo: string | null }[]}
      restaurantId={ws.restaurant.id}
      userId={ws.user.id}
      requireSelfie={ws.settings.require_selfie !== false}
      clockLocked={lockedAreas(ws.restaurant.plan).includes("/ponto")}
      weekStartUtc={weekStartUtc}
      dayStartUtc={dayStart}
      today={mine(todayPerf) ?? null}
      week={mine(weekPerf) ?? null}
      myTabs={(myTabs ?? []) as { id: string; number: number; label: string; opened_at: string }[]}
      myOrders={(myOrders ?? []) as { id: string; number: number; status: string; total: number; table_label: string | null; created_at: string }[]}
      showSales={canOrders}
      currency={ws.restaurant.currency}
      locale={ws.restaurant.locale}
      timezone={tz}
    />
  );
}

function addDaysIso(iso: string, days: number) {
  return new Date(new Date(iso).getTime() + days * 86400000).toISOString();
}
