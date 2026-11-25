"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock, PartyPopper } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StartTrialButton } from "@/components/billing/start-trial-button";
import { formatBRL, PLANS, TRIAL_DAYS } from "@/lib/billing";

const FREE = ["Painel do restaurante", "Pedidos e tela da cozinha", "Cardápio com até 15 itens", "Só você (1 usuário)"];
const PAID = ["Comandas para garçons no tablet", "Finanças, lucro e contas fixas", "Estoque que baixa sozinho", "Equipe, ponto com selfie e desempenho", "Assistente IA e integrações"];

/** Shown once, right after the account and restaurant are created. */
export function PlanWelcomeDialog({ canTrial }: { canTrial: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const close = () => { setOpen(false); router.replace("/dashboard"); };
  const cheapest = PLANS.find((p) => p.price > 0)!;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent size="lg" title="Seu restaurante está pronto!" description="Você começou no plano Grátis. Quer liberar tudo?"
        footer={<div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center">
          <Button variant="ghost" onClick={close}>Continuar no Grátis</Button>
          <span className="flex-1" />
          <Button asChild variant="secondary" size="lg"><Link href="/assinatura">Ver planos e assinar</Link></Button>
          {canTrial && <StartTrialButton label={`Testar tudo por ${TRIAL_DAYS} dias grátis`} onDone={close} />}
        </div>}>
        <div className="flex items-center gap-3 rounded-xl bg-brand-soft/60 p-4 ring-1 ring-brand/25">
          <PartyPopper className="size-6 shrink-0 text-brand" />
          <p className="text-sm text-ink-2">{canTrial
            ? <>Teste <strong className="text-ink">todas as funções por {TRIAL_DAYS} dias, sem cartão</strong>. Depois, se não assinar, você volta para o Grátis e não perde nada.</>
            : <>Assine um plano para liberar tudo. Planos a partir de <strong className="text-ink">{formatBRL(cheapest.price)}/mês</strong>.</>}</p>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-surface-2 p-4 ring-1 ring-line">
            <p className="text-sm font-semibold">Plano Grátis</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-2">{FREE.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-good" />{f}</li>)}</ul>
          </div>
          <div className="rounded-xl bg-surface-2 p-4 ring-1 ring-brand/40">
            <p className="text-sm font-semibold">Nos planos pagos, também</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-2">{PAID.map((f) => <li key={f} className="flex gap-2"><Lock className="mt-0.5 size-4 shrink-0 text-brand" />{f}</li>)}</ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
