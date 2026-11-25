import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight, BellRing, Calculator, ChefHat, CircleCheck, ClipboardList, FileSpreadsheet, HelpCircle, Lock, MonitorSmartphone,
  NotebookPen, Package, Receipt, ShieldCheck, Smartphone, Sparkles, TrendingUp, UsersRound, X,
} from "lucide-react";
import { ForklyLogo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { BrowserFrame, PhoneFrame } from "@/components/marketing/frames";
import { PLANS, TRIAL_DAYS } from "@/lib/billing";
import { isSupabaseConfigured } from "@/lib/env";
import { getUser } from "@/lib/workspace";

const RESTAURANT_KINDS = ["Hamburguerias", "Pizzarias", "Bistrôs", "Bares e botecos", "Lanchonetes", "Cafeterias", "Food trucks", "Dark kitchens", "Marmitarias", "Japoneses"];

const BEFORE = [
  { icon: NotebookPen, text: "Pedido anotado no papel, que some ou chega errado na cozinha" },
  { icon: FileSpreadsheet, text: "Planilhas espalhadas e o caixa conferido no fim da noite" },
  { icon: HelpCircle, text: "No fim do mês, você não sabe direito quanto sobrou" },
  { icon: Package, text: "O ingrediente acaba no meio do serviço" },
];
const AFTER = [
  { icon: ChefHat, text: "Pedidos de todos os canais numa fila só, direto na tela da cozinha" },
  { icon: Receipt, text: "Entradas e saídas lançadas na hora, com o lucro calculado sozinho" },
  { icon: TrendingUp, text: "Painel mostra quanto você faturou, gastou e lucrou — em segundos" },
  { icon: BellRing, text: "O Forkly avisa antes de faltar e baixa o estoque a cada venda" },
];

const SHOWCASE = [
  {
    eyebrow: "Pedidos e cozinha",
    title: "Da comanda de papel para a tela da cozinha",
    text: "Cada pedido aparece na hora para a cozinha, com observações e alergias em destaque. Um toque e ele passa para “em preparo”, “pronto” e “concluído”.",
    bullets: ["Feita para tablet e toque", "Avisa quando um pedido está atrasado", "Som para pedido novo"],
    img: "/screens/cozinha.webp", alt: "tela da cozinha", icon: ChefHat,
  },
  {
    eyebrow: "Finanças",
    title: "Saiba quanto sobrou no fim do mês",
    text: "Faturamento, despesas e lucro em gráficos simples. Contas fixas, como aluguel e salários, são lançadas sozinhas todo mês.",
    bullets: ["Para onde vai cada real", "Comprovantes guardados no lugar certo", "Exporta para planilha em um clique"],
    img: "/screens/financas.webp", alt: "finanças", icon: Receipt,
  },
  {
    eyebrow: "Ficha técnica",
    title: "Descubra quanto custa cada prato",
    text: "Monte a ficha técnica com os ingredientes do estoque e veja na hora o custo, o lucro e a margem de cada item do cardápio.",
    bullets: ["CMV calculado automaticamente", "Aviso quando a margem fica baixa", "Baixa no estoque a cada venda"],
    img: "/screens/ficha-tecnica.webp", alt: "ficha técnica", icon: Calculator,
  },
  {
    eyebrow: "Equipe",
    title: "Cada pessoa vê só o que precisa",
    text: "Convide a equipe e escolha o cargo de cada um. Crie cargos do seu jeito — Caixa, Garçom, Estoquista — e decida, área por área, o que cada cargo vê ou edita.",
    bullets: ["Cargos prontos e personalizados", "A cozinha vê a cozinha, o contador vê as finanças", "Mudou de ideia? Vale na hora"],
    img: "/screens/cargos.webp", alt: "cargos e permissões", icon: UsersRound,
  },
];

const STEPS = [
  { n: "1", title: "Crie sua conta", text: "Leva menos de um minuto. Não pedimos cartão de crédito.", icon: Sparkles },
  { n: "2", title: "Configure em 10 passos", text: "Nome, logo, cores, cardápio e estoque — com dicas em cada etapa. Pode pular o que quiser.", icon: ClipboardList },
  { n: "3", title: `Use ${TRIAL_DAYS} dias de graça`, text: "Tudo liberado. No fim do teste, você escolhe o plano que faz sentido.", icon: CircleCheck },
];

const FAQ = [
  { q: "Preciso cadastrar cartão para testar?", a: `Não. O teste de ${TRIAL_DAYS} dias é totalmente grátis e sem cartão. Você só escolhe um plano se quiser continuar.` },
  { q: "O que acontece quando o teste acaba?", a: "Seus dados ficam guardados. Para continuar usando, é só escolher um dos planos." },
  { q: "Sou ruim com tecnologia. Vou conseguir usar?", a: "Sim. O Forkly foi feito para quem vive o restaurante, não para quem é de TI. Cada número tem uma explicação, e a configuração inicial te guia passo a passo." },
  { q: "Funciona no celular e no tablet?", a: "Sim. Funciona no navegador do computador, do tablet e do celular — a tela da cozinha foi feita para toque." },
  { q: "Já integra com iFood e outros apps?", a: "As integrações estão em desenvolvimento e dependem da aprovação de cada plataforma. Enquanto isso, você lança os pedidos em poucos toques." },
  { q: "Posso trocar de plano ou cancelar?", a: "Pode, quando quiser. Não tem fidelidade nem multa." },
  { q: "Meus dados ficam seguros?", a: "Sim. Cada restaurante tem os dados isolados e protegidos — ninguém de fora, nem de outro restaurante, consegue vê-los." },
];

export default async function Home() {
  if (isSupabaseConfigured && (await getUser())) redirect("/dashboard");
  return (
    <div className="app-glow min-h-dvh overflow-x-hidden">
      {/* ------------------------------------------------------------ header */}
      <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <ForklyLogo />
          <nav className="flex items-center gap-1 sm:gap-2">
            <a href="#recursos" className="hidden rounded-md px-3 py-2 text-sm text-ink-2 hover:text-ink md:block">Recursos</a>
            <a href="#como-funciona" className="hidden rounded-md px-3 py-2 text-sm text-ink-2 hover:text-ink lg:block">Como funciona</a>
            <a href="#planos" className="hidden rounded-md px-3 py-2 text-sm text-ink-2 hover:text-ink md:block">Planos</a>
            <a href="#duvidas" className="hidden rounded-md px-3 py-2 text-sm text-ink-2 hover:text-ink lg:block">Dúvidas</a>
            <Button asChild variant="ghost"><Link href="/login">Entrar</Link></Button>
            <Button asChild variant="primary"><Link href="/signup">Testar grátis</Link></Button>
          </nav>
        </div>
      </header>

      <main>
        {/* ------------------------------------------------------------ hero */}
        <section className="relative mx-auto max-w-6xl px-5 pt-14 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3.5 py-1.5 text-sm font-medium text-brand ring-1 ring-brand/30">
              <Sparkles className="size-4" /> {TRIAL_DAYS} dias grátis · sem cartão de crédito
            </span>
            <h1 className="mt-6 text-[44px] font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Seu restaurante.<br /><span className="text-gradient">Sob controle.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-2 sm:text-xl">
              Pedidos, cozinha, finanças, estoque e equipe <strong className="font-semibold text-ink">num só lugar</strong> — simples de usar, mesmo para quem não é de tecnologia.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="xl" variant="primary"><Link href="/signup">Começar meu teste grátis <ArrowRight /></Link></Button>
              <Button asChild size="xl" variant="secondary"><Link href="/signup?demo=1">Ver um restaurante de exemplo</Link></Button>
            </div>
            <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-ink-3">
              <li className="flex items-center gap-1.5"><CircleCheck className="size-4 text-good" /> Sem cartão</li>
              <li className="flex items-center gap-1.5"><CircleCheck className="size-4 text-good" /> Sem instalação</li>
              <li className="flex items-center gap-1.5"><CircleCheck className="size-4 text-good" /> 100% em português</li>
              <li className="flex items-center gap-1.5"><CircleCheck className="size-4 text-good" /> Cancele quando quiser</li>
            </ul>
          </div>

          <div className="relative mx-auto mt-14 max-w-5xl pb-10">
            <div className="pointer-events-none absolute -inset-x-10 -top-10 bottom-0 rounded-[3rem] bg-[radial-gradient(60%_60%_at_50%_30%,rgba(56,189,248,0.28),transparent_70%)] blur-2xl" aria-hidden />
            <BrowserFrame src="/screens/painel.webp" alt="painel do restaurante" priority className="relative" />
            <PhoneFrame src="/screens/celular.webp" alt="Forkly no celular" className="absolute -bottom-2 -right-2 hidden w-44 rotate-3 sm:block lg:-right-14 lg:w-56" />
            <div className="absolute -left-3 top-1/3 hidden rounded-xl bg-surface-2/95 px-4 py-3 shadow-pop ring-1 ring-white/10 backdrop-blur md:block lg:-left-12">
              <p className="flex items-center gap-2 text-xs text-ink-3"><span className="size-2 rounded-full bg-good" /> Agora mesmo</p>
              <p className="mt-1 text-sm font-semibold">Pedido #3412 pronto ✓</p>
            </div>
            <div className="absolute -right-3 top-10 hidden rounded-xl bg-surface-2/95 px-4 py-3 shadow-pop ring-1 ring-white/10 backdrop-blur lg:block lg:-right-10">
              <p className="text-xs text-ink-3">Lucro do mês</p>
              <p className="mt-0.5 text-lg font-semibold text-good">+ R$ 33.524</p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ for whom */}
        <section className="border-y border-line/70 bg-surface/40 py-8">
          <div className="mx-auto max-w-6xl px-5">
            <p className="text-center text-sm font-medium text-ink-3">Feito para quem vive o restaurante</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {RESTAURANT_KINDS.map((k) => <span key={k} className="rounded-full bg-surface-2 px-3.5 py-1.5 text-sm text-ink-2 ring-1 ring-line">{k}</span>)}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ before / after */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand">Menos planilha, mais cozinha</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Chega de administrar o restaurante no improviso</h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-surface p-6 shadow-card">
              <p className="flex items-center gap-2 font-semibold text-ink-2"><X className="size-5 text-bad" /> Sem o Forkly</p>
              <ul className="mt-5 flex flex-col gap-4">
                {BEFORE.map((b) => (
                  <li key={b.text} className="flex gap-3 text-ink-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-bad-soft text-bad"><b.icon className="size-4" /></span><span className="pt-1.5 text-sm">{b.text}</span></li>
                ))}
              </ul>
            </div>
            <div className="glow-ring rounded-2xl bg-surface p-6 shadow-card">
              <p className="flex items-center gap-2 font-semibold"><CircleCheck className="size-5 text-good" /> Com o Forkly</p>
              <ul className="mt-5 flex flex-col gap-4">
                {AFTER.map((b) => (
                  <li key={b.text} className="flex gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"><b.icon className="size-4" /></span><span className="pt-1.5 text-sm text-ink">{b.text}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ showcase */}
        <section id="recursos" className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-10">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand">Do pedido ao lucro</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Tudo o que o seu restaurante precisa, sem complicação</h2>
            <p className="mt-4 text-ink-2">Estas são telas de verdade do Forkly, com dados de exemplo.</p>
          </div>
          <div className="mt-16 flex flex-col gap-24">
            {SHOWCASE.map((s, i) => (
              <div key={s.title} className="grid items-center gap-10 lg:grid-cols-[1fr_1.35fr]">
                <div className={i % 2 ? "lg:order-2" : ""}>
                  <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand"><s.icon className="size-3.5" /> {s.eyebrow}</span>
                  <h3 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">{s.title}</h3>
                  <p className="mt-4 leading-relaxed text-ink-2">{s.text}</p>
                  <ul className="mt-6 flex flex-col gap-2.5">
                    {s.bullets.map((b) => <li key={b} className="flex items-center gap-2.5 text-sm"><CircleCheck className="size-4 shrink-0 text-good" />{b}</li>)}
                  </ul>
                </div>
                <div className={i % 2 ? "relative lg:order-1" : "relative"}>
                  <div className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-[radial-gradient(60%_60%_at_50%_50%,rgba(167,139,250,0.20),transparent_70%)] blur-2xl" aria-hidden />
                  <BrowserFrame src={s.img} alt={s.alt} className="relative" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------ more */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: MonitorSmartphone, title: "Computador, tablet e celular", text: "Abra no navegador de qualquer aparelho. Nada para instalar." },
              { icon: Sparkles, title: "Com a cara do seu restaurante", text: "Seu logo, suas cores e o painel organizado do seu jeito." },
              { icon: BellRing, title: "Avisos que ajudam", text: "Estoque acabando, contas vencendo e gastos fora do normal." },
              { icon: Lock, title: "Seus dados protegidos", text: "Cada restaurante isolado. Só a sua equipe vê o que é seu." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl bg-surface p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-pop">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand"><f.icon className="size-5" /></span>
                <h3 className="mt-4 text-[15px] font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-3">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------ how it works */}
        <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-12">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand">Comece hoje</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Em 5 minutos o seu restaurante está no Forkly</h2>
              <ol className="mt-10 flex flex-col gap-6">
                {STEPS.map((s) => (
                  <li key={s.n} className="flex gap-4">
                    <span className="surface-gradient flex size-11 shrink-0 items-center justify-center rounded-xl text-base font-bold">{s.n}</span>
                    <div><h3 className="font-semibold">{s.title}</h3><p className="mt-1 text-sm text-ink-3">{s.text}</p></div>
                  </li>
                ))}
              </ol>
              <Button asChild size="lg" variant="primary" className="mt-10"><Link href="/signup">Criar minha conta grátis <ArrowRight /></Link></Button>
            </div>
            <div className="relative mx-auto w-full max-w-xs">
              <div className="pointer-events-none absolute -inset-10 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(56,189,248,0.25),transparent_70%)] blur-2xl" aria-hidden />
              <PhoneFrame src="/screens/celular-cozinha.webp" alt="tela da cozinha no celular" className="relative -rotate-2" />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ pricing */}
        <section id="planos" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand">Planos</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Preço justo, sem surpresa</h2>
            <p className="mt-4 text-ink-2">Teste qualquer plano por {TRIAL_DAYS} dias, de graça. Sem fidelidade — cancele quando quiser.</p>
          </div>
          <div className="mt-14">
            <PricingCards cta={(key) => (
              <Button asChild variant={key === "profissional" ? "primary" : "secondary"} size="lg" className="w-full">
                <Link href={`/signup?plano=${key}`}>Testar {TRIAL_DAYS} dias grátis</Link>
              </Button>
            )} />
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-ink-3">
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-brand" /> Dados protegidos</span>
            <span className="flex items-center gap-1.5"><Smartphone className="size-4 text-brand" /> Funciona em qualquer aparelho</span>
            <span className="flex items-center gap-1.5"><CircleCheck className="size-4 text-brand" /> Sem taxa de instalação</span>
          </div>
        </section>

        {/* ------------------------------------------------------------ faq */}
        <section id="duvidas" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-12">
          <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">Dúvidas frequentes</h2>
          <div className="mt-10 flex flex-col gap-2">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-xl bg-surface p-5 shadow-card open:ring-1 open:ring-brand/30">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {f.q}<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-lg text-ink-2 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------ final cta */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="surface-gradient relative overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12">
            <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-white/20 blur-3xl" aria-hidden />
            <h2 className="relative text-3xl font-semibold tracking-tight sm:text-4xl">Seu restaurante merece mais do que um caderno.</h2>
            <p className="relative mx-auto mt-4 max-w-lg text-lg opacity-80">Crie sua conta agora e use tudo por {TRIAL_DAYS} dias, sem pagar nada. Planos a partir de R$ {PLANS[0]!.price}/mês.</p>
            <Button asChild size="xl" className="relative mt-8 bg-[#06101f] text-white shadow-none hover:bg-[#06101f]/90"><Link href="/signup">Começar meu teste grátis <ArrowRight /></Link></Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-ink-3">
          <ForklyLogo />
          <nav className="flex gap-5"><a href="#recursos" className="hover:text-ink">Recursos</a><a href="#planos" className="hover:text-ink">Planos</a><a href="#duvidas" className="hover:text-ink">Dúvidas</a><Link href="/login" className="hover:text-ink">Entrar</Link></nav>
          <span>© {new Date().getFullYear()} Forkly · Seu restaurante. Sob controle.</span>
        </div>
      </footer>
    </div>
  );
}
