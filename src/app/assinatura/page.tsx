import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { CheffeDataLogo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";
import { PlanComparison, PricingCards } from "@/components/marketing/pricing-cards";
import { StartTrialButton } from "@/components/billing/start-trial-button";
import { SALES_CONTACT, TRIAL_DAYS, planName, trialStatus } from "@/lib/billing";
import { getUser, getWorkspace } from "@/lib/workspace";

export const metadata = { title: "Planos" };

export default async function SubscriptionPage() {
  if (!(await getUser())) redirect("/login?next=/assinatura");
  const ws = await getWorkspace();
  if (!ws) redirect("/onboarding");
  const r = ws.restaurant;
  const t = trialStatus(r);
  const isOwner = ws.role === "owner";
  const canTrial = isOwner && r.plan === "free" && !r.trial_used && !r.is_demo;

  return (
    <div className="app-glow min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <CheffeDataLogo />
        <Button asChild variant="ghost"><Link href="/dashboard"><ArrowLeft /> Voltar ao painel</Link></Button>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-16 pt-6">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Planos do CheffeData</h1>
          <p className="mt-3 text-ink-2">
            Plano atual de <strong className="text-ink">{r.name}</strong>: <strong className="text-ink">{planName(r.plan)}</strong>
            {t.onTrial && <> — faltam <strong className="text-brand">{t.daysLeft} {t.daysLeft === 1 ? "dia" : "dias"}</strong> de teste.</>}
          </p>
          {canTrial && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <StartTrialButton label={`Testar tudo grátis por ${TRIAL_DAYS} dias`} />
              <p className="text-xs text-ink-3">Sem cartão. Depois do teste você volta para o Grátis, sem perder nada.</p>
            </div>
          )}
        </div>

        <div className="mt-12">
          <PricingCards currentPlan={r.plan} cta={(key) => key === "free" ? (
            <Button asChild variant="ghost" size="lg" className="w-full"><Link href="/dashboard">{r.plan === "free" ? "Continuar no Grátis" : "Voltar ao painel"}</Link></Button>
          ) : SALES_CONTACT && isOwner ? (
            <Button asChild variant={key === "profissional" ? "primary" : "secondary"} size="lg" className="w-full">
              <a href={SALES_CONTACT} target="_blank" rel="noopener noreferrer"><MessageCircle /> Quero este plano</a>
            </Button>
          ) : (
            <p className="rounded-lg bg-surface-2 px-3 py-2.5 text-center text-xs text-ink-3">
              {isOwner ? "Pagamento online em configuração" : "Só o dono do restaurante pode escolher o plano"}
            </p>
          )} />
        </div>

        <div className="mt-12"><PlanComparison /></div>

        <p className="mx-auto mt-8 max-w-xl text-center text-sm text-ink-3">
          {SALES_CONTACT
            ? "Por enquanto a ativação é feita pela nossa equipe: clique em “Quero este plano” e fale com a gente. Em breve você poderá pagar por cartão ou Pix aqui mesmo."
            : "O pagamento online (cartão e Pix) está sendo configurado. Enquanto isso, a ativação dos planos é feita diretamente pela equipe do CheffeData."}
        </p>
      </main>
    </div>
  );
}
