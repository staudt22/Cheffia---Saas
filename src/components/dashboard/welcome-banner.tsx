"use client";

import Link from "next/link";
import { useState } from "react";
import { PartyPopper, X } from "lucide-react";

export function WelcomeBanner({ isDemo }: { isDemo: boolean }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg bg-surface p-4 shadow-card animate-slide-up">
      <PartyPopper className="mt-0.5 size-5 shrink-0 text-accent" />
      <div className="flex-1 text-sm">
        <p className="font-semibold">{isDemo ? "Seu restaurante de exemplo está pronto" : "Seu restaurante está pronto no CheffeData"}</p>
        <p className="mt-0.5 text-ink-3">
          {isDemo ? "Explore seis semanas de dados de exemplo. Abra a tela da cozinha, conclua um pedido ou personalize este painel." : <>Próximos passos: <Link className="text-brand hover:underline" href="/orders?new=1">crie seu primeiro pedido</Link>, <Link className="text-brand hover:underline" href="/finances">lance uma despesa</Link> ou <Link className="text-brand hover:underline" href="/menu">monte as fichas técnicas</Link> para o CheffeData calcular o custo dos pratos.</>}
        </p>
      </div>
      <button onClick={() => setOpen(false)} className="rounded p-1 text-ink-3 hover:bg-surface-3" aria-label="Fechar"><X className="size-4" /></button>
    </div>
  );
}
