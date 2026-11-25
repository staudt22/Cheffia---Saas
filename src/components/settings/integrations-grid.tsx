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
  "You click Connect and Forkly explains what will be shared.",
  "You sign in to the platform and approve access.",
  "The platform sends you back to Forkly.",
  "Forkly confirms the connection and stores the access token encrypted, server-side only.",
  "Orders start syncing into your queue and kitchen display.",
];

export function IntegrationsGrid({ providers, simulatedCount, canEdit, canCreateOrders, locale, timezone }: { providers: P[]; simulatedCount: number; canEdit: boolean; canCreateOrders: boolean; locale: string; timezone: string }) {
  const [pending, start] = useTransition();
  const [about, setAbout] = useState<P | null>(null);

  return (
    <>
      <div className="mb-5 flex gap-3 rounded-lg bg-info-soft px-4 py-3 text-sm text-info">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>Live connections need partner approval and app credentials from each platform, so none are active yet. Delivery platforms offer a <strong>demo mode</strong> that creates orders clearly marked “Simulated” — they never mix with real platform orders.{simulatedCount > 0 && ` You have ${simulatedCount} simulated order${simulatedCount === 1 ? "" : "s"}.`}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {providers.map((p) => {
          const demo = p.status === "demo";
          return (
            <Card key={p.key} className="flex flex-col p-4">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ background: p.color }} aria-hidden>{p.short}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-ink-3">{p.category}</p>
                </div>
                {p.status === "connected" ? <Badge tone="good">Connected</Badge>
                  : p.status === "error" ? <Badge tone="bad">Error</Badge>
                  : demo ? <Badge tone="accent"><FlaskConical /> Demo mode</Badge>
                  : p.availability === "needs_credentials" ? <Badge tone="warn">Needs credentials</Badge>
                  : <Badge tone="outline">Coming soon</Badge>}
              </div>
              <p className="mt-3 flex-1 text-sm text-ink-2">{p.description}</p>
              {p.lastError && <p className="mt-2 rounded-md bg-bad-soft px-2 py-1 text-xs text-bad">{p.lastError}</p>}
              <p className="mt-3 text-xs text-ink-3">Last sync: {p.lastSync ? new Date(p.lastSync).toLocaleString(locale, { timeZone: timezone, dateStyle: "medium", timeStyle: "short" }) : "never"}</p>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                <Button size="sm" variant="ghost" onClick={() => setAbout(p)}><Plug /> How it works</Button>
                {p.supportsDemo && canEdit && (demo ? (
                  <>
                    {canCreateOrders && <Button size="sm" onClick={() => start(async () => { const r = await simulateOrderAction(p.key); if (!r.ok) toast.error(r.error); else toast.success(r.message); })} loading={pending}><Send /> Send test order</Button>}
                    <Button size="sm" variant="ghost" onClick={() => start(async () => { const r = await setDemoModeAction(p.key, false); if (!r.ok) toast.error(r.error); })}>Turn off demo</Button>
                  </>
                ) : (
                  <Button size="sm" onClick={() => start(async () => { const r = await setDemoModeAction(p.key, true); if (!r.ok) toast.error(r.error); else toast.success(`${p.name} demo mode on`); })}><FlaskConical /> Try demo mode</Button>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!about} onOpenChange={(o) => !o && setAbout(null)}>
        {about && (
          <DialogContent title={`Connecting ${about.name}`} description={about.availability === "coming_soon" ? "This connector is not built yet." : "Ready once credentials are configured."}>
            <ol className="flex flex-col gap-2.5">
              {FLOW.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold">{i + 1}</span><span className="pt-0.5">{s}</span></li>
              ))}
            </ol>
            <div className="mt-5 rounded-lg bg-surface-2 p-3 text-sm">
              <p className="font-medium">What&apos;s needed</p>
              <p className="mt-1 text-ink-2">An approved {about.name} partner/developer account and these server environment variables:</p>
              <p className="mt-2 flex flex-wrap gap-1.5">{about.requiredEnv.map((e) => <code key={e} className="rounded bg-surface-3 px-1.5 py-0.5 text-xs">{e}</code>)}</p>
            </div>
            <a href={about.partnerUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">{about.name} developer programme <ExternalLink className="size-3.5" /></a>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
