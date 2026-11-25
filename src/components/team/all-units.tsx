"use client";

import { Suspense, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { RestaurantAvatar } from "@/components/app/restaurant-avatar";
import { CategoryBars } from "@/components/dashboard/charts";
import { switchRestaurant } from "@/lib/actions/restaurant";
import { cn, formatMoney, formatPercent, pctChange } from "@/lib/utils";
import type { DateRange } from "@/lib/dates";

interface Unit { id: string; name: string; logo: string | null; revenue: number; expenses: number; orders: number; prevRevenue: number; current: boolean }

export function AllUnits({ units, range, currency, locale }: { units: Unit[]; range: DateRange; currency: string; locale: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const money = (v: number) => formatMoney(v, currency, locale);
  const tot = units.reduce((a, u) => ({ revenue: a.revenue + u.revenue, expenses: a.expenses + u.expenses, orders: a.orders + u.orders }), { revenue: 0, expenses: 0, orders: 0 });
  const sorted = [...units].sort((a, b) => b.revenue - a.revenue);

  return (
    <div>
      <PageHeader title="Todas as unidades" description="Seus restaurantes lado a lado. Clique numa unidade para abrir o painel dela." actions={<Suspense><DateRangePicker range={range} /></Suspense>} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="surface-gradient p-4"><p className="text-[13px] opacity-80">Faturamento somado</p><p className="mt-1.5 text-2xl font-semibold tabular">{money(tot.revenue)}</p></Card>
        <Card className="p-4"><p className="text-[13px] text-ink-3">Despesas somadas</p><p className="mt-1.5 text-2xl font-semibold tabular">{money(tot.expenses)}</p></Card>
        <Card className="p-4"><p className="text-[13px] text-ink-3">Lucro estimado</p><p className={cn("mt-1.5 text-2xl font-semibold tabular", tot.revenue - tot.expenses < 0 && "text-bad")}>{money(tot.revenue - tot.expenses)}</p></Card>
        <Card className="p-4"><p className="text-[13px] text-ink-3">Pedidos</p><p className="mt-1.5 text-2xl font-semibold tabular">{tot.orders}</p></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <Table>
            <thead><tr><Th>Unidade</Th><Th className="text-right">Faturamento</Th><Th className="hidden text-right sm:table-cell">vs anterior</Th><Th className="hidden text-right md:table-cell">Despesas</Th><Th className="text-right">Lucro</Th><Th className="hidden text-right sm:table-cell">Pedidos</Th><Th /></tr></thead>
            <tbody>
              {sorted.map((u) => {
                const ch = pctChange(u.revenue, u.prevRevenue);
                return (
                  <Tr key={u.id}>
                    <Td><span className="flex items-center gap-2"><RestaurantAvatar name={u.name} logoUrl={u.logo} /><span className="font-medium">{u.name}</span>{u.current && <Badge tone="brand">Aberta agora</Badge>}</span></Td>
                    <Td className="text-right font-medium tabular">{money(u.revenue)}</Td>
                    <Td className={cn("hidden text-right tabular sm:table-cell", ch == null ? "text-ink-3" : ch >= 0 ? "text-good" : "text-bad")}>{ch == null ? "—" : `${ch > 0 ? "+" : ""}${formatPercent(ch, locale)}`}</Td>
                    <Td className="hidden text-right tabular text-ink-2 md:table-cell">{money(u.expenses)}</Td>
                    <Td className={cn("text-right tabular", u.revenue - u.expenses < 0 && "text-bad")}>{money(u.revenue - u.expenses)}</Td>
                    <Td className="hidden text-right tabular sm:table-cell">{u.orders}</Td>
                    <Td className="text-right">{!u.current && <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => { await switchRestaurant(u.id); router.push("/dashboard"); router.refresh(); })}>Abrir <ArrowRight /></Button>}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
        <Card>
          <CardHeader title="Faturamento por unidade" description={range.label} />
          <div className="p-4"><CategoryBars data={sorted.map((u) => ({ label: u.name, amount: u.revenue }))} currency={currency} locale={locale} /></div>
        </Card>
      </div>
    </div>
  );
}
