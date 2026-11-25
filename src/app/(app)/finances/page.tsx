import { Suspense } from "react";
import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { resolveRange } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { FinancesView } from "@/components/finances/finances-view";
import type { Expense, RevenueRecord, Supplier } from "@/lib/types";

export const metadata = { title: "Finanças" };

export default async function FinancesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ws = await requireWorkspace("finances");
  const params = await searchParams;
  const r = ws.restaurant;
  const range = resolveRange(r.timezone, params.range, params.from, params.to);
  const supabase = await createClient();
  const rid = r.id;

  // Materialise any recurring expenses that have come due (idempotent).
  if (ws.permissions.finances.edit) await supabase.rpc("generate_recurring_expenses", { p_restaurant: rid });

  const [cur, prev, daily, breakdown, expenses, revenue, recurring, suppliers] = await Promise.all([
    supabase.rpc("period_totals", { p_restaurant: rid, p_from: range.from, p_to: range.to }).single(),
    supabase.rpc("period_totals", { p_restaurant: rid, p_from: range.prevFrom, p_to: range.prevTo }).single(),
    supabase.rpc("daily_series", { p_restaurant: rid, p_from: range.from, p_to: range.to }),
    supabase.rpc("expense_breakdown", { p_restaurant: rid, p_from: range.from, p_to: range.to }),
    supabase.from("expenses").select("*").eq("restaurant_id", rid).gte("date", range.from).lte("date", range.to).order("date", { ascending: false }).limit(1000),
    supabase.from("revenue_records").select("id, description, amount, source, date, order_id, payment_method, notes").eq("restaurant_id", rid).gte("date", range.from).lte("date", range.to).order("date", { ascending: false }).limit(3000),
    supabase.from("expenses").select("*").eq("restaurant_id", rid).eq("is_recurring", true).order("next_due_on"),
    ws.permissions.suppliers.view ? supabase.from("suppliers").select("id, name, contact_name, phone, email").eq("restaurant_id", rid).order("name") : Promise.resolve({ data: [] }),
  ]);

  const t = (x: unknown) => ({ revenue: Number((x as Record<string, unknown>)?.revenue ?? 0), expenses: Number((x as Record<string, unknown>)?.expenses ?? 0) });

  return (
    <div>
      <PageHeader title="Finanças" description="O que entrou, o que saiu e quanto sobrou." actions={<Suspense><DateRangePicker range={range} /></Suspense>} />
      <FinancesView
        range={range}
        totals={t(cur.data)}
        previous={t(prev.data)}
        daily={((daily.data ?? []) as { day: string; revenue: number; expenses: number }[]).map((d) => ({ date: d.day, revenue: Number(d.revenue), expenses: Number(d.expenses) }))}
        breakdown={((breakdown.data ?? []) as { category: string; amount: number }[]).map((b) => ({ category: b.category, amount: Number(b.amount) }))}
        expenses={(expenses.data ?? []) as Expense[]}
        revenue={(revenue.data ?? []) as RevenueRecord[]}
        recurring={(recurring.data ?? []) as Expense[]}
        suppliers={(suppliers.data ?? []) as Supplier[]}
        restaurantId={rid}
        currency={r.currency}
        locale={r.locale}
        canEdit={ws.permissions.finances.edit}
        initialTab={params.tab === "transactions" || params.tab === "recurring" ? params.tab : "overview"}
      />
    </div>
  );
}
