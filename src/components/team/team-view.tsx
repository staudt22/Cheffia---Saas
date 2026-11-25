"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, Pencil, Plus, Trash2, Trophy, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { SimpleBars } from "@/components/dashboard/charts";
import { deleteTimeEntryAction, saveTimeEntryAction } from "@/app/(app)/team/actions";
import { formatDuration, formatTime, utcToZonedInput } from "@/lib/dates";
import { cn, formatMoney, initials } from "@/lib/utils";

interface Hours { employee_id: string; full_name: string; job_title: string | null; member_id: string | null; minutes: number; entries: number; on_shift_since: string | null }
interface Perf { user_id: string; full_name: string; orders: number; completed: number; cancelled: number; revenue: number; items: number; tables: number; tabs_closed: number; last_order_at: string | null }
interface Entry { id: string; employee_id: string; clock_in: string; clock_out: string | null; name: string }

export function TeamView({ rangeLabel, hours, perf, entries, employees, canEdit, showPerformance, performanceLocked, currency, locale, timezone }: {
  rangeLabel: string; hours: Hours[]; perf: Perf[]; entries: Entry[]; employees: { id: string; full_name: string; position: string | null }[];
  canEdit: boolean; showPerformance: boolean; performanceLocked?: boolean; currency: string; locale: string; timezone: string;
}) {
  const [tab, setTab] = useState<"now" | "clock" | "performance">("now");
  const [editing, setEditing] = useState<Entry | "new" | null>(null);
  const [now] = useState(() => Date.now());
  const money = (v: number) => formatMoney(Number(v), currency, locale);
  const onShift = hours.filter((h) => h.on_shift_since);
  const totalMin = hours.reduce((s, h) => s + Number(h.minutes), 0);
  const best = [...perf].sort((a, b) => Number(b.revenue) - Number(a.revenue))[0];
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { weekday: "short", day: "2-digit", month: "2-digit", timeZone: timezone }).format(new Date(iso));

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4"><p className="text-[13px] text-ink-3">Trabalhando agora</p><p className="mt-1.5 text-2xl font-semibold tabular text-good">{onShift.length}</p></Card>
        <Card className="p-4"><p className="text-[13px] text-ink-3">Horas da equipe · {rangeLabel.toLowerCase()}</p><p className="mt-1.5 text-2xl font-semibold tabular">{formatDuration(totalMin)}</p></Card>
        <Card className="p-4"><p className="text-[13px] text-ink-3">Pessoas na equipe</p><p className="mt-1.5 text-2xl font-semibold tabular">{employees.length}</p></Card>
        <Card className="p-4"><p className="flex items-center gap-1.5 text-[13px] text-ink-3"><Trophy className="size-3.5 text-accent" /> Quem mais vendeu</p><p className="mt-1.5 truncate text-lg font-semibold">{performanceLocked ? "Plano Profissional" : best ? best.full_name : "—"}</p>{best && !performanceLocked && <p className="text-xs text-ink-3">{money(best.revenue)}</p>}</Card>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented size="md" ariaLabel="Seção" value={tab} onChange={setTab} options={[
          { value: "now", label: "Visão geral" }, { value: "clock", label: "Registros de ponto" },
          ...(showPerformance ? [{ value: "performance" as const, label: "Desempenho" }] : []),
        ]} />
        <div className="ml-auto flex gap-2">
          {tab === "clock" && canEdit && <Button onClick={() => setEditing("new")}><Plus /> Adicionar registro</Button>}
          {canEdit && <Button asChild variant="ghost"><Link href="/settings?tab=users"><UserPlus /> Convidar pessoa</Link></Button>}
        </div>
      </div>

      {tab === "now" && (
        hours.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {hours.map((h) => {
              const p = perf.find((x) => x.full_name === h.full_name);
              return (
                <Card key={h.employee_id} className={cn("p-4", h.on_shift_since && "ring-1 ring-good/40")}>
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-3 text-sm font-semibold">{initials(h.full_name)}</span>
                    <div className="min-w-0 flex-1"><p className="truncate font-medium">{h.full_name}</p><p className="truncate text-xs text-ink-3">{h.job_title ?? "Equipe"}</p></div>
                    {h.on_shift_since ? <Badge tone="good">No turno desde {formatTime(h.on_shift_since, locale, timezone)}</Badge> : <Badge tone="neutral">Fora do turno</Badge>}
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-surface-2 p-2"><dt className="text-[11px] text-ink-3">Horas</dt><dd className="font-semibold tabular">{formatDuration(Number(h.minutes))}</dd></div>
                    <div className="rounded-md bg-surface-2 p-2"><dt className="text-[11px] text-ink-3">Pedidos</dt><dd className="font-semibold tabular">{p ? p.orders : 0}</dd></div>
                    <div className="rounded-md bg-surface-2 p-2"><dt className="text-[11px] text-ink-3">Mesas</dt><dd className="font-semibold tabular">{p ? p.tables : 0}</dd></div>
                  </dl>
                </Card>
              );
            })}
          </div>
        ) : <Card><EmptyState icon={<Users />} title="Ninguém na equipe ainda" description="Convide as pessoas em Configurações → Usuários. Cada uma bate o ponto pela própria conta, em “Minha área”." /></Card>
      )}

      {tab === "clock" && (
        <Card>
          {entries.length ? (
            <Table>
              <thead><tr><Th>Pessoa</Th><Th>Dia</Th><Th>Entrada</Th><Th>Saída</Th><Th className="text-right">Duração</Th>{canEdit && <Th />}</tr></thead>
              <tbody>
                {entries.map((e) => {
                  const mins = ((e.clock_out ? new Date(e.clock_out).getTime() : now) - new Date(e.clock_in).getTime()) / 60000;
                  return (
                    <Tr key={e.id}>
                      <Td className="font-medium">{e.name}</Td>
                      <Td className="text-ink-2">{date(e.clock_in)}</Td>
                      <Td className="tabular">{formatTime(e.clock_in, locale, timezone)}</Td>
                      <Td className="tabular">{e.clock_out ? formatTime(e.clock_out, locale, timezone) : <Badge tone="good">Trabalhando</Badge>}</Td>
                      <Td className={cn("text-right font-medium tabular", mins > 12 * 60 && "text-warn")} suppressHydrationWarning>{formatDuration(mins)}</Td>
                      {canEdit && <Td className="text-right"><Button size="icon-sm" variant="ghost" aria-label="Corrigir registro" onClick={() => setEditing(e)}><Pencil /></Button></Td>}
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          ) : <EmptyState icon={<Clock />} title="Nenhum registro de ponto neste período" description="Os registros aparecem aqui quando a equipe bate o ponto em “Minha área”." />}
        </Card>
      )}

      {tab === "performance" && performanceLocked && (
        <Card className="mx-auto max-w-xl p-8 text-center">
          <Trophy className="mx-auto size-8 text-accent" />
          <h3 className="mt-3 text-lg font-semibold">Desempenho da equipe no plano Profissional</h3>
          <p className="mt-2 text-sm text-ink-2">Veja quantos pedidos cada garçom lançou, quais mesas atendeu, quanto vendeu e o ticket médio de cada um.</p>
          <Button asChild variant="primary" className="mt-5"><Link href="/assinatura">Ver planos</Link></Button>
        </Card>
      )}
      {tab === "performance" && !performanceLocked && (
        perf.length ? (
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <Table>
                <thead><tr><Th>Pessoa</Th><Th className="text-right">Pedidos</Th><Th className="text-right">Mesas</Th><Th className="hidden text-right sm:table-cell">Itens</Th><Th className="hidden text-right md:table-cell">Comandas</Th><Th className="text-right">Vendido</Th><Th className="hidden text-right sm:table-cell">Ticket médio</Th></tr></thead>
                <tbody>
                  {perf.map((p, i) => (
                    <Tr key={p.user_id}>
                      <Td className="font-medium">{i === 0 && Number(p.revenue) > 0 && <Trophy className="mr-1.5 inline size-4 text-accent" />}{p.full_name}</Td>
                      <Td className="text-right tabular">{p.orders}{Number(p.cancelled) > 0 && <span className="ml-1 text-xs text-bad">({p.cancelled} canc.)</span>}</Td>
                      <Td className="text-right tabular">{p.tables}</Td>
                      <Td className="hidden text-right tabular sm:table-cell">{p.items}</Td>
                      <Td className="hidden text-right tabular md:table-cell">{p.tabs_closed}</Td>
                      <Td className="text-right font-medium tabular">{money(p.revenue)}</Td>
                      <Td className="hidden text-right tabular text-ink-2 sm:table-cell">{Number(p.completed) ? money(Number(p.revenue) / Number(p.completed)) : "—"}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </Card>
            <Card>
              <CardHeader title="Vendas por pessoa" description={rangeLabel} />
              <div className="px-2 pb-3 pt-2">
                <SimpleBars data={perf.slice(0, 8).map((p) => ({ label: p.full_name.split(" ")[0]!, value: Number(p.revenue) }))} format={(v) => formatMoney(v, currency, locale, true)} height={240} />
              </div>
            </Card>
          </div>
        ) : <Card><EmptyState icon={<Trophy />} title="Nenhum pedido no período" description="Cada pedido e comanda fica registrado com quem lançou. O ranking aparece aqui." /></Card>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && <EntryDialog entry={editing === "new" ? null : editing} employees={employees} timezone={timezone} onDone={() => setEditing(null)} />}
      </Dialog>
    </div>
  );
}

function EntryDialog({ entry, employees, timezone, onDone }: { entry: Entry | null; employees: { id: string; full_name: string }[]; timezone: string; onDone: () => void }) {
  const router = useRouter();
  const [v, setV] = useState({
    employee_id: entry?.employee_id ?? employees[0]?.id ?? "",
    clock_in: entry ? utcToZonedInput(entry.clock_in, timezone) : "",
    clock_out: entry?.clock_out ? utcToZonedInput(entry.clock_out, timezone) : "",
  });
  const [pending, start] = useTransition();
  return (
    <DialogContent size="sm" title={entry ? `Corrigir ponto · ${entry.name}` : "Adicionar registro de ponto"} description="Use quando alguém esqueceu de bater o ponto."
      footer={<>
        {entry && <Button variant="danger-ghost" className="mr-auto" loading={pending} onClick={() => start(async () => { const r = await deleteTimeEntryAction(entry.id); if (!r.ok) return void toast.error(r.error); toast.success("Registro excluído"); router.refresh(); onDone(); })}><Trash2 /> Excluir</Button>}
        <Button variant="ghost" onClick={onDone}>Cancelar</Button>
        <Button variant="primary" loading={pending} disabled={!v.employee_id || !v.clock_in} onClick={() => start(async () => {
          const r = await saveTimeEntryAction(entry?.id ?? null, v);
          if (!r.ok) return void toast.error(r.error);
          toast.success("Ponto salvo"); router.refresh(); onDone();
        })}>Salvar</Button>
      </>}>
      <div className="flex flex-col gap-4">
        <Field label="Pessoa" htmlFor="te-emp">
          <Select id="te-emp" value={v.employee_id} disabled={!!entry} onChange={(e) => setV({ ...v, employee_id: e.target.value })}>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </Select>
        </Field>
        <Field label="Entrada" htmlFor="te-in"><Input id="te-in" type="datetime-local" value={v.clock_in} onChange={(e) => setV({ ...v, clock_in: e.target.value })} /></Field>
        <Field label="Saída" htmlFor="te-out" hint="Deixe em branco se a pessoa ainda está trabalhando."><Input id="te-out" type="datetime-local" value={v.clock_out} onChange={(e) => setV({ ...v, clock_out: e.target.value })} /></Field>
      </div>
    </DialogContent>
  );
}
