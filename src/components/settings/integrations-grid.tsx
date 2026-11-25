"use client";

import { useState, useTransition } from "react";
import { ExternalLink, FlaskConical, Info, Plug, Send } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { setDemoModeAction } from "@/app/(app)/integrations/actions";
import { simulateOrderAction } from "@/app/(app)/orders/actions";
import type { Availability, ProviderInfo } from "@/lib/integrations/types";

type P = ProviderInfo & { availability: Availability; status: string; lastSync: string | null; lastError: string | null };

const FLOW = [
  "Você clica em Conectar e o CheffeData explica o que será compartilhado.",
  "Você entra na plataforma e autoriza o acesso.",
  "A plataforma te devolve para o CheffeData.",
  "O CheffeData confirma a conexão e guarda o acesso com segurança, só no servidor.",
  "Os pedidos começam a chegar na sua fila e na tela da cozinha.",
];

export function IntegrationsGrid({ providers, simulatedCount, canEdit, canCreateOrders, locale, timezone }: { providers: P[]; simulatedCount: number; canEdit: boolean; canCreateOrders: boolean; locale: string; timezone: string }) {
  const [pending, start] = useTransition();
  const [about, setAbout] = useState<P | null>(null);

  return (
    <>
      <div className="mb-5 flex gap-3 rounded-lg bg-info-soft px-4 py-3 text-sm text-info">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>Para conectar de verdade, cada plataforma precisa aprovar o CheffeData como parceiro — por isso nenhuma está ativa ainda. Os apps de delivery têm um <strong>modo demonstração</strong>, que cria pedidos marcados como “Simulado” e nunca se misturam com pedidos reais.{simulatedCount > 0 && ` Você tem ${simulatedCount} ${simulatedCount === 1 ? "pedido simulado" : "pedidos simulados"}.`}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {providers.map((p) => {
          const demo = p.status === "demo";
          return (
            <Card key={p.key} className="flex flex-col p-4">
              <div className="flex items-start gap-3">
                {p.logo
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={p.logo} alt="" className="size-10 shrink-0 rounded-lg bg-white object-contain p-1" />
                  : <span className="flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ background: p.color }} aria-hidden>{p.short}</span>}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-ink-3">{p.category}</p>
                </div>
                {p.status === "connected" ? <Badge tone="good">Conectado</Badge>
                  : p.status === "error" ? <Badge tone="bad">Erro</Badge>
                  : demo ? <Badge tone="accent"><FlaskConical /> Modo demonstração</Badge>
                  : p.availability === "needs_credentials" ? <Badge tone="warn">Falta configurar</Badge>
                  : <Badge tone="outline">Em breve</Badge>}
              </div>
              <p className="mt-3 flex-1 text-sm text-ink-2">{p.description}</p>
              {p.lastError && <p className="mt-2 rounded-md bg-bad-soft px-2 py-1 text-xs text-bad">{p.lastError}</p>}
              <p className="mt-3 text-xs text-ink-3">Última sincronização: {p.lastSync ? new Date(p.lastSync).toLocaleString(locale, { timeZone: timezone, dateStyle: "medium", timeStyle: "short" }) : "nunca"}</p>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                <Button size="sm" variant="ghost" onClick={() => setAbout(p)}><Plug /> Como funciona</Button>
                {p.supportsDemo && canEdit && (demo ? (
                  <>
                    {canCreateOrders && <Button size="sm" onClick={() => start(async () => { const r = await simulateOrderAction(p.key); if (!r.ok) toast.error(r.error); else toast.success(r.message); })} loading={pending}><Send /> Enviar pedido de teste</Button>}
                    <Button size="sm" variant="ghost" onClick={() => start(async () => { const r = await setDemoModeAction(p.key, false); if (!r.ok) toast.error(r.error); })}>Desligar demonstração</Button>
                  </>
                ) : (
                  <Button size="sm" onClick={() => start(async () => { const r = await setDemoModeAction(p.key, true); if (!r.ok) toast.error(r.error); else toast.success(`Modo demonstração do ${p.name} ligado`); })}><FlaskConical /> Testar em modo demonstração</Button>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!about} onOpenChange={(o) => !o && setAbout(null)}>
        {about && (
          <DialogContent title={`Como conectar o ${about.name}`} description={about.availability === "coming_soon" ? "Esta conexão ainda está sendo construída." : "Fica pronta quando as credenciais forem configuradas."}>
            <ol className="flex flex-col gap-2.5">
              {FLOW.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold">{i + 1}</span><span className="pt-0.5">{s}</span></li>
              ))}
            </ol>
            <div className="mt-5 rounded-lg bg-surface-2 p-3 text-sm">
              <p className="font-medium">O que é preciso</p>
              <p className="mt-1 text-ink-2">Uma conta de parceiro/desenvolvedor aprovada no {about.name} e estas variáveis no servidor:</p>
              <p className="mt-2 flex flex-wrap gap-1.5">{about.requiredEnv.map((e) => <code key={e} className="rounded bg-surface-3 px-1.5 py-0.5 text-xs">{e}</code>)}</p>
            </div>
            <a href={about.partnerUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">Programa de parceiros do {about.name} <ExternalLink className="size-3.5" /></a>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
