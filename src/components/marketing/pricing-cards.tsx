import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS, formatBRL } from "@/lib/billing";
import { cn } from "@/lib/utils";

/** Plan cards. `cta` decides what each card's button does. */
export function PricingCards({ cta, currentPlan }: { cta: (planKey: string) => React.ReactNode; currentPlan?: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {PLANS.map((p) => (
        <div key={p.key} className={cn("relative flex flex-col rounded-2xl bg-surface p-6 shadow-card", p.highlight && "glow-ring", !p.price && "bg-surface/60")}>
          {p.highlight && <span className="surface-gradient absolute -top-3 left-6 rounded-full px-3 py-1 text-xs font-semibold">Mais escolhido</span>}
          {currentPlan === p.key && <span className="absolute right-6 top-6 rounded-full bg-good-soft px-2.5 py-0.5 text-xs font-medium text-good">Seu plano</span>}
          <h3 className="text-lg font-semibold">{p.name}</h3>
          <p className="mt-1 min-h-10 text-sm text-ink-3">{p.tagline}</p>
          <p className="mt-5 flex items-baseline gap-1">
            <span className="text-4xl font-semibold tracking-tight tabular">{p.price ? formatBRL(p.price) : "R$ 0"}</span>
            <span className="text-sm text-ink-3">{p.price ? "/mês" : "para sempre"}</span>
          </p>
          <ul className="mt-5 flex flex-col gap-1.5 border-t border-line pt-5 text-sm">
            {p.limits.map((l) => <li key={l} className="font-medium text-ink">{l}</li>)}
          </ul>
          <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm text-ink-2">
            {p.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-brand" />{f}</li>)}
          </ul>
          <div className="mt-6">{cta(p.key)}</div>
        </div>
      ))}
    </div>
  );
}

export function TrialCta({ highlight }: { highlight?: boolean }) {
  return (
    <Button asChild variant={highlight ? "primary" : "secondary"} size="lg" className="w-full">
      <Link href="/signup">Começar 7 dias grátis</Link>
    </Button>
  );
}

const CHECK = "✓";
const ROWS: { label: string; values: [string, string, string, string] }[] = [
  { label: "Restaurantes", values: ["1", "1", "1", "Até 5"] },
  { label: "Usuários", values: ["Só você", "Até 3", "Até 15", "Ilimitados"] },
  { label: "Painel do restaurante", values: [CHECK, CHECK, CHECK, CHECK] },
  { label: "Pedidos e tela da cozinha", values: [CHECK, CHECK, CHECK, CHECK] },
  { label: "Cardápio", values: ["Até 15 itens", "Ilimitado", "Ilimitado", "Ilimitado"] },
  { label: "Ficha técnica e custo de cada prato", values: ["", CHECK, CHECK, CHECK] },
  { label: "Comandas no tablet para garçons", values: ["", CHECK, CHECK, CHECK] },
  { label: "Finanças, lucro e contas fixas", values: ["", CHECK, CHECK, CHECK] },
  { label: "Estoque que baixa sozinho", values: ["", CHECK, CHECK, CHECK] },
  { label: "Ponto eletrônico com selfie", values: ["", CHECK, CHECK, CHECK] },
  { label: "Apps de delivery integrados", values: ["", "1", "Ilimitados", "Ilimitados"] },
  { label: "Desempenho de cada garçom", values: ["", "", CHECK, CHECK] },
  { label: "Cargos personalizados", values: ["", "", CHECK, CHECK] },
  { label: "Assistente IA com os seus dados", values: ["", "", CHECK, CHECK] },
  { label: "Painel com todas as unidades", values: ["", "", "", CHECK] },
];

/** Feature-by-feature comparison of the four plans. */
export function PlanComparison() {
  return (
    <div className="overflow-x-auto rounded-2xl bg-surface shadow-card">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 bg-surface px-4 py-4 text-left font-medium text-ink-3">Compare os planos</th>
            {PLANS.map((p) => (
              <th key={p.key} className={cn("px-3 py-4 text-center", p.highlight && "bg-brand-soft/50")}>
                <span className="block font-semibold text-ink">{p.name}</span>
                <span className="block text-xs font-normal text-ink-3">{p.price ? `${formatBRL(p.price)}/mês` : "R$ 0"}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.label} className="border-t border-line">
              <td className="sticky left-0 bg-surface px-4 py-3 text-ink-2">{r.label}</td>
              {r.values.map((v, i) => (
                <td key={i} className={cn("px-3 py-3 text-center", PLANS[i]?.highlight && "bg-brand-soft/30")}>
                  {v === CHECK ? <Check className="mx-auto size-4 text-brand" aria-label="Incluído" /> : v ? <span className="text-ink">{v}</span> : <span className="text-ink-3" aria-label="Não incluído">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
