import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Clock, MessageCircle } from "lucide-react";
import { ForklyLogo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { SALES_CONTACT, planName, trialStatus } from "@/lib/billing";
import { getUser, getWorkspace } from "@/lib/workspace";

export const metadata = { title: "Planos" };

export default async function SubscriptionPage() {
  if (!(await getUser())) redirect("/login?next=/assinatura");
  const ws = await getWorkspace();
  if (!ws) redirect("/onboarding");
  const r = ws.restaurant;
  const t = trialStatus(r);
  const isOwner = ws.role === "owner";

  return (
    <div className="app-glow min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <ForklyLogo />
        {!t.expired && <Button asChild variant="ghost"><Link href="/dashboard"><ArrowLeft /> Voltar ao painel</Link></Button>}
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-16 pt-6">
        <div className="mx-auto max-w-2xl text-center">
          {t.expired ? (
            <>
              <span className="inline-flex items-center gap-2 rounded-full bg-warn-soft px-3 py-1 text-sm font-medium text-warn"><Clock className="size-4" /> Seu teste grátis terminou</span>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Escolha um plano para continuar usando o Forkly</h1>
              <p className="mt-3 text-ink-2">Todos os dados de <strong className="text-ink">{r.name}</strong> estão guardados — pedidos, cardápio, estoque e finanças. Assim que o plano for ativado, tudo volta exatamente como estava.</p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Planos do Forkly</h1>
              <p className="mt-3 text-ink-2">
                Plano atual de <strong className="text-ink">{r.name}</strong>: <strong className="text-ink">{planName(r.plan)}</strong>
                {t.onTrial && <> — faltam <strong className="text-brand">{t.daysLeft} {t.daysLeft === 1 ? "dia" : "dias"}</strong> de teste.</>}
              </p>
            </>
          )}
        </div>

        <div className="mt-12">
          <PricingCards currentPlan={r.plan} cta={(key) => SALES_CONTACT && isOwner ? (
            <Button asChild variant={key === "profissional" ? "primary" : "secondary"} size="lg" className="w-full">
              <a href={SALES_CONTACT} target="_blank" rel="noopener noreferrer"><MessageCircle /> Quero este plano</a>
            </Button>
          ) : (
            <p className="rounded-lg bg-surface-2 px-3 py-2.5 text-center text-xs text-ink-3">
              {isOwner ? "Pagamento online em configuração" : "Só o dono do restaurante pode escolher o plano"}
            </p>
          )} />
        </div>

        <p className="mx-auto mt-8 max-w-xl text-center text-sm text-ink-3">
          {SALES_CONTACT
            ? "Por enquanto a ativação é feita pela nossa equipe: clique em “Quero este plano” e fale com a gente. Em breve você poderá pagar por cartão ou Pix aqui mesmo."
            : "O pagamento online (cartão e Pix) está sendo configurado. Enquanto isso, a ativação dos planos é feita diretamente pela equipe do Forkly."}
        </p>
      </main>
    </div>
  );
}
