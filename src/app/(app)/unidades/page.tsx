import Link from "next/link";
import { Layers, Sparkles } from "lucide-react";
import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { resolveRange } from "@/lib/dates";
import { planAllows } from "@/lib/billing";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AllUnits } from "@/components/team/all-units";

export const metadata = { title: "Todas as unidades" };

export default async function AllUnitsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ws = await requireWorkspace("overview");
  const params = await searchParams;
  if (!planAllows(ws.restaurant.plan, "all_units")) {
    return (
      <div>
        <PageHeader title="Todas as unidades" description="Veja todos os seus restaurantes juntos, lado a lado." />
        <Card className="mx-auto max-w-xl p-8 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-brand-soft text-brand"><Layers className="size-6" /></span>
          <h2 className="mt-4 text-lg font-semibold">Disponível no plano Rede</h2>
          <p className="mt-2 text-sm text-ink-2">Com o plano Rede você acompanha até 5 restaurantes num painel só: faturamento, despesas, lucro e pedidos de cada unidade, lado a lado.</p>
          <Button asChild variant="primary" className="mt-6"><Link href="/assinatura"><Sparkles /> Ver planos</Link></Button>
        </Card>
      </div>
    );
  }
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
