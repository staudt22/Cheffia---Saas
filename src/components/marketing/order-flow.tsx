"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { IconCheckDone, IconKitchen, IconPhoneOrder } from "./icons";
import { CheffeDataGlyph } from "@/components/app/logo";

const SOURCES = [
  { name: "iFood", soon: true }, { name: "99Food", soon: true }, { name: "Rappi", soon: true },
  { name: "Salão e comandas", soon: false }, { name: "Balcão", soon: false },
];

/** Animated "app → CheffeData → kitchen → done" flow. App names are text only; delivery apps are marked as coming soon. */
export function OrderFlow() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % 4), 1300);
    return () => window.clearInterval(id);
  }, []);

  const nodes = [
    {
      title: "Pedido chega", icon: IconPhoneOrder,
      body: (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {SOURCES.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2.5 py-1 text-[11px] font-medium text-ink ring-1 ring-line">
              {s.name}{s.soon && <span className="rounded-full bg-accent-soft px-1.5 text-[9px] font-semibold uppercase tracking-wide text-accent">em breve</span>}
            </span>
          ))}
        </div>
      ),
    },
    { title: "CheffeData", icon: null, body: <p className="mt-2 text-xs text-ink-3">Junta tudo numa fila só, com o preço do cardápio e quem lançou.</p> },
    { title: "Cozinha", icon: IconKitchen, body: <p className="mt-2 text-xs text-ink-3">Aparece na tela da cozinha na hora, com observações em destaque.</p> },
    { title: "Pedido concluído", icon: IconCheckDone, body: <p className="mt-2 text-xs text-ink-3">Receita lançada e estoque baixado sozinhos.</p> },
  ];

  return (
    <div className="relative">
      <div className="grid gap-4 md:grid-cols-4 md:gap-6">
        {nodes.map((n, i) => {
          const on = i === active, done = i < active;
          return (
            <div key={n.title} className="relative">
              <div className={cn("relative h-full rounded-2xl bg-surface p-5 text-center ring-1 transition-all duration-500", on ? "ring-brand shadow-[0_0_0_4px_var(--brand-soft),0_18px_50px_-18px_var(--brand-glow)]" : done ? "ring-brand/30" : "ring-line")}>
                <span className={cn("mx-auto flex size-12 items-center justify-center rounded-xl transition-colors duration-500", on || done ? "bg-brand text-brand-foreground" : "bg-brand-soft text-brand", i === 1 && "surface-gradient")}>
                  {n.icon ? <n.icon className="size-6" /> : <CheffeDataGlyph className="size-6" />}
                </span>
                <p className="mt-3 text-[15px] font-semibold">{n.title}</p>
                {n.body}
                <span className={cn("absolute right-3 top-3 text-[10px] font-semibold tabular", on ? "text-brand" : "text-ink-3")}>{i + 1}</span>
              </div>
              {i < nodes.length - 1 && (
                <div className="pointer-events-none absolute -right-6 top-1/2 hidden h-0.5 w-6 -translate-y-1/2 bg-line md:block" aria-hidden>
                  {on && <span className="absolute top-1/2 size-2 -translate-y-1/2 rounded-full bg-brand shadow-[0_0_12px_var(--brand)] animate-[travel_1.3s_linear]" />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
