import Link from "next/link";
import { Check, Hourglass } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

export function ComingSoon({ title, description, planned, ready, links }: {
  title: string; description: string; planned: string[]; ready?: string[]; links?: { href: string; label: string }[];
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <Card className="max-w-2xl p-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent"><Hourglass className="size-3.5" /> Próxima etapa</span>
        <h2 className="mt-4 text-lg font-semibold">Esta área está sendo construída</h2>
        <p className="mt-1 text-sm text-ink-2">Veja o que ela vai ter. Nada aqui é de mentira — cada recurso aparece quando estiver funcionando de verdade.</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {planned.map((p) => <li key={p} className="flex gap-2 text-sm text-ink-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-line-strong" />{p}</li>)}
        </ul>
        {ready && ready.length > 0 && (
          <>
            <p className="mt-6 text-xs font-medium uppercase tracking-wide text-ink-3">Já funciona</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {ready.map((r) => <li key={r} className="flex gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-good" />{r}</li>)}
            </ul>
          </>
        )}
        {links && <div className="mt-6 flex flex-wrap gap-2">{links.map((l) => <Button key={l.href} asChild size="sm"><Link href={l.href}>{l.label}</Link></Button>)}</div>}
      </Card>
    </div>
  );
}
