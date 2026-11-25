"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowUp, Database, Lock, RotateCcw, Sparkles, WifiOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string; sources?: string[]; error?: boolean };

const SOURCE_LABEL: Record<string, string> = {
  resumo_do_periodo: "Resumo financeiro", vendas_por_dia: "Vendas por dia", produtos_mais_vendidos: "Mais vendidos",
  despesas_por_categoria: "Despesas", estoque_atual: "Estoque", margens_do_cardapio: "Cardápio e fichas técnicas",
  desempenho_da_equipe: "Desempenho da equipe", horas_da_equipe: "Ponto da equipe", pedidos_em_andamento: "Pedidos", contas_fixas: "Contas fixas",
};

const SUGGESTIONS: { text: string; needs: string }[] = [
  { text: "Quanto faturei este mês e quanto sobrou?", needs: "resumo_do_periodo" },
  { text: "Quais pratos têm a menor margem?", needs: "margens_do_cardapio" },
  { text: "O que está acabando no estoque?", needs: "estoque_atual" },
  { text: "Quem vendeu mais esta semana?", needs: "desempenho_da_equipe" },
  { text: "Para onde foi o dinheiro no mês passado?", needs: "despesas_por_categoria" },
  { text: "Qual foi o melhor dia de vendas nos últimos 30 dias?", needs: "vendas_por_dia" },
];

/** Minimal, safe rendering: paragraphs, "- " bullets and **bold**. No HTML from the model. */
function Rich({ text }: { text: string }) {
  const inline = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => part.startsWith("**") && part.endsWith("**") ? <strong key={i} className="font-semibold text-ink">{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>);
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="flex flex-col gap-2.5">
      {blocks.map((b, i) => {
        const lines = b.split("\n").filter(Boolean);
        if (lines.every((l) => /^\s*([-*•]|\d+\.)\s/.test(l))) {
          return <ul key={i} className="flex flex-col gap-1 pl-1">{lines.map((l, j) => <li key={j} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />{inline(l.replace(/^\s*([-*•]|\d+\.)\s/, ""))}</li>)}</ul>;
        }
        return <p key={i}>{lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l.replace(/^#+\s*/, ""))}</Fragment>)}</p>;
      })}
    </div>
  );
}

export function AssistantChat({ status, firstName, dailyLimit, areas }: { status: "ready" | "plan" | "not_configured"; firstName: string; dailyLimit: number; areas: string[] }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, busy]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next: Msg[] = [...messages.filter((m) => !m.error), { role: "user", content: q }];
    setMessages(next); setInput(""); setBusy(true);
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: next.slice(-20).map(({ role, content }) => ({ role, content })) }) });
      const data = await res.json().catch(() => ({}));
      setMessages([...next, res.ok ? { role: "assistant", content: data.reply, sources: data.sources } : { role: "assistant", content: data.error ?? "O assistente não respondeu. Tente de novo.", error: true }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Sem conexão. Verifique a internet e tente de novo.", error: true }]);
    } finally { setBusy(false); }
  }

  const suggestions = SUGGESTIONS.filter((s) => areas.includes(s.needs)).slice(0, 4);

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col">
      <PageHeader title="Assistente IA" description="Pergunte sobre o seu restaurante do jeito que você fala." />
      <div className="mb-4 flex items-start gap-3 rounded-xl bg-brand-soft/60 px-4 py-3 text-sm ring-1 ring-brand/25">
        <Lock className="mt-0.5 size-4 shrink-0 text-brand" />
        <p className="text-ink-2"><strong className="text-ink">Só usa os dados do seu restaurante.</strong> O assistente não acessa a internet nem nenhuma outra fonte: ele consulta apenas pedidos, finanças, estoque, cardápio e equipe que estão no CheffeData, respeitando o que o seu cargo pode ver.</p>
      </div>

      {status !== "ready" ? (
        <Card className="mx-auto mt-6 max-w-lg p-8 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-brand-soft text-brand">{status === "plan" ? <Sparkles className="size-6" /> : <WifiOff className="size-6" />}</span>
          <h2 className="mt-4 text-lg font-semibold">{status === "plan" ? "Disponível nos planos Profissional e Rede" : "O assistente ainda não foi ativado"}</h2>
          <p className="mt-2 text-sm text-ink-2">{status === "plan"
            ? "Pergunte “quanto lucrei este mês?” ou “o que está acabando?” e receba a resposta com os seus números."
            : "Falta configurar a chave do serviço de IA no servidor (variável ANTHROPIC_API_KEY na Vercel). Assim que ela for adicionada, o chat aparece aqui."}</p>
          {status === "plan" && <Button asChild variant="primary" className="mt-5"><Link href="/assinatura">Ver planos</Link></Button>}
        </Card>
      ) : (
        <Card className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {!messages.length ? (
              <div className="mx-auto flex max-w-xl flex-col items-center py-6 text-center">
                <span className="surface-gradient flex size-12 items-center justify-center rounded-2xl"><Sparkles className="size-6" /></span>
                <h2 className="mt-4 text-xl font-semibold">Olá{firstName ? `, ${firstName}` : ""}! Em que posso ajudar?</h2>
                <p className="mt-1.5 text-sm text-ink-3">Toque numa sugestão ou escreva a sua pergunta.</p>
                <div className="mt-6 grid grid-cols-1 w-full gap-2 sm:grid-cols-2">
                  {suggestions.map((s) => (
                    <button key={s.text} onClick={() => void ask(s.text)} className="rounded-xl bg-surface-2 px-4 py-3 text-left text-sm ring-1 ring-line transition hover:bg-surface-3 hover:ring-brand/40">{s.text}</button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto flex max-w-3xl flex-col gap-4">
                {messages.map((m, i) => m.role === "user" ? (
                  <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-[15px] text-brand-foreground">{m.content}</div>
                ) : (
                  <div key={i} className="flex max-w-[92%] gap-3">
                    <span className="surface-gradient mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full"><Sparkles className="size-4" /></span>
                    <div className={cn("min-w-0 rounded-2xl rounded-tl-md px-4 py-3 text-[15px] leading-relaxed", m.error ? "bg-bad-soft text-bad" : "bg-surface-2 text-ink-2")}>
                      {m.error ? m.content : <Rich text={m.content} />}
                      {!!m.sources?.length && (
                        <p className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-2.5 text-xs text-ink-3">
                          <Database className="size-3.5" /> Consultado no CheffeData:
                          {m.sources.map((s) => <span key={s} className="rounded-full bg-surface-3 px-2 py-0.5">{SOURCE_LABEL[s] ?? s}</span>)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {busy && (
                  <div className="flex gap-3">
                    <span className="surface-gradient flex size-8 shrink-0 items-center justify-center rounded-full"><Sparkles className="size-4" /></span>
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-surface-2 px-4 py-3.5" aria-label="Pensando">
                      {[0, 1, 2].map((d) => <span key={d} className="size-2 animate-pulse-soft rounded-full bg-ink-3" style={{ animationDelay: `${d * 0.2}s` }} />)}
                      <span className="ml-2 text-sm text-ink-3">Consultando os seus dados…</span>
                    </div>
                  </div>
                )}
                <div ref={end} />
              </div>
            )}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); void ask(input); }} className="border-t border-line p-3 sm:p-4">
            <div className="mx-auto flex max-w-3xl items-end gap-2">
              {messages.length > 0 && <Button type="button" variant="ghost" size="icon" aria-label="Nova conversa" onClick={() => setMessages([])} disabled={busy}><RotateCcw /></Button>}
              <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1} maxLength={2000} placeholder="Escreva sua pergunta…"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void ask(input); } }}
                className="max-h-40 min-h-11 flex-1 resize-none rounded-xl bg-surface-2 px-4 py-2.5 text-[15px] text-ink outline-none ring-1 ring-line placeholder:text-ink-3 focus:ring-brand" aria-label="Sua pergunta" />
              <Button type="submit" variant="primary" size="icon" className="size-11 rounded-xl" disabled={!input.trim() || busy} aria-label="Enviar"><ArrowUp /></Button>
            </div>
            <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-ink-3">Até {dailyLimit} perguntas por dia no seu plano. Confira números importantes nas telas de Finanças e Estoque.</p>
          </form>
        </Card>
      )}
    </div>
  );
}
