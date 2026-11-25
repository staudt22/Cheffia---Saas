import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS, formatBRL } from "@/lib/billing";
import { cn } from "@/lib/utils";

/** Plan cards. `cta` decides what each card's button does. */
export function PricingCards({ cta, currentPlan }: { cta: (planKey: string) => React.ReactNode; currentPlan?: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {PLANS.map((p) => (
        <div key={p.key} className={cn("relative flex flex-col rounded-2xl bg-surface p-6 shadow-card", p.highlight && "glow-ring")}>
          {p.highlight && <span className="surface-gradient absolute -top-3 left-6 rounded-full px-3 py-1 text-xs font-semibold">Mais escolhido</span>}
          {currentPlan === p.key && <span className="absolute right-6 top-6 rounded-full bg-good-soft px-2.5 py-0.5 text-xs font-medium text-good">Seu plano</span>}
          <h3 className="text-lg font-semibold">{p.name}</h3>
          <p className="mt-1 min-h-10 text-sm text-ink-3">{p.tagline}</p>
          <p className="mt-5 flex items-baseline gap-1">
            <span className="text-4xl font-semibold tracking-tight tabular">{formatBRL(p.price)}</span>
            <span className="text-sm text-ink-3">/mês</span>
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
