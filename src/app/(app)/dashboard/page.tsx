import { Suspense } from "react";
import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { greeting, resolveRange } from "@/lib/dates";
import { loadDashboardData } from "@/lib/dashboard/data";
import { Dashboard } from "@/components/dashboard/dashboard";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import type { DashboardLayout } from "@/lib/types";
import { PlanWelcomeDialog } from "@/components/billing/plan-welcome-dialog";

export const metadata = { title: "Visão geral" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ws = await requireWorkspace("overview");
  const params = await searchParams;
  const r = ws.restaurant;
  const range = resolveRange(r.timezone, params.range, params.from, params.to);
  const supabase = await createClient();

  const [{ data: layouts }, data] = await Promise.all([
    supabase.from("dashboard_layouts").select("id, name, is_active, density, widgets").eq("restaurant_id", r.id).order("created_at"),
    loadDashboardData(ws, range),
  ]);

  const today = new Intl.DateTimeFormat(r.locale, { weekday: "long", month: "long", day: "numeric", timeZone: r.timezone }).format(new Date());

  const showPlanOffer = params.welcome === "1" && r.plan === "free" && !r.is_demo && ws.role === "owner";

  return (
    <div>
      {showPlanOffer && <PlanWelcomeDialog canTrial={!r.trial_used} />}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-ink-3">{today}</p>
          <h1 className="mt-1 font-display text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">
            {greeting(r.timezone)}, <span className="text-gradient">{r.name}</span>
          </h1>
        </div>
        <Suspense><DateRangePicker range={range} /></Suspense>
      </div>
      {params.welcome && <WelcomeBanner isDemo={r.is_demo} />}
      {params.denied && (
        <p className="mb-4 rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">Seu cargo não tem acesso a essa área. Peça ao dono para liberar nas permissões.</p>
      )}
      {!data.hasAnyData && !r.is_demo && (
        <div className="mb-4 rounded-lg bg-brand-soft px-4 py-3 text-sm text-ink-2">
          <span className="font-medium text-brand">Seus números vão aparecer aqui.</span> Crie o primeiro pedido ou lance uma despesa — todos os quadros se atualizam sozinhos.
        </div>
      )}
      <Dashboard
        layouts={(layouts ?? []) as DashboardLayout[]}
        data={data}
        currency={r.currency}
        locale={r.locale}
        timezone={r.timezone}
        permissions={ws.permissions}
        canEdit={ws.permissions.overview.edit}
      />
    </div>
  );
}
