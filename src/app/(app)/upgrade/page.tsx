import Link from "next/link";
import { Lock } from "lucide-react";
import { requireWorkspace } from "@/lib/workspace";
import { AREA_INFO, minimumPlanFor, TRIAL_DAYS } from "@/lib/billing";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StartTrialButton } from "@/components/billing/start-trial-button";

export const metadata = { title: "Disponível em planos pagos" };

export default async function UpgradePage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const ws = await requireWorkspace();
  const { area = "" } = await searchParams;
  const info = AREA_INFO[area] ?? { name: "Esta área", pitch: "Mude de plano para liberar esta parte do CheffeData." };
  const canTrial = ws.role === "owner" && ws.restaurant.plan === "free" && !ws.restaurant.trial_used;
  return (
    <Card className="mx-auto mt-6 max-w-xl p-8 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand"><Lock className="size-7" /></span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">{info.name} não está no seu plano</h1>
      <p className="mx-auto mt-3 max-w-md text-ink-2">{info.pitch}</p>
      <p className="mt-2 text-sm text-ink-3">Disponível a partir do plano <strong className="text-ink">{minimumPlanFor(area)}</strong>.</p>
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        {canTrial && <StartTrialButton label={`Testar tudo grátis por ${TRIAL_DAYS} dias`} />}
        <Button asChild size="lg" variant={canTrial ? "secondary" : "primary"}><Link href="/assinatura">Ver planos</Link></Button>
      </div>
      {ws.role !== "owner" && <p className="mt-4 text-sm text-ink-3">Fale com o dono do restaurante para mudar de plano.</p>}
    </Card>
  );
}
