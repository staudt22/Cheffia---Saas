import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight, BellRing, ChefHat, CircleCheck, ClipboardList, FileSpreadsheet, HelpCircle, MonitorSmartphone,
  MousePointerClick, NotebookPen, Package, Receipt, ShieldCheck, Smartphone, Sparkles, TrendingUp, X,
} from "lucide-react";
import { CheffeDataLogo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";
import { PlanComparison, PricingCards } from "@/components/marketing/pricing-cards";
import { BrowserFrame, PhoneFrame } from "@/components/marketing/frames";
import { LiveDashboard } from "@/components/marketing/live-dashboard";
import { OrderFlow } from "@/components/marketing/order-flow";
import { IconClock, IconKitchen, IconMoney, IconStock, IconTab, IconTeam } from "@/components/marketing/icons";
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
  { icon: BellRing, text: "O CheffeData avisa antes de faltar e baixa o estoque a cada venda" },
];

const SHOWCASE = [
  {
    eyebrow: "Pedidos e cozinha",
    title: "Da comanda de papel para a tela da cozinha",
    text: "Cada pedido aparece na hora para a cozinha, com observações e alergias em destaque. Um toque e ele passa para “em preparo”, “pronto” e “concluído”.",
    bullets: ["Feita para tablet e toque", "Avisa quando um pedido está atrasado", "Som para pedido novo"],
    img: "/screens/cozinha.webp", alt: "tela da cozinha", icon: IconKitchen,
  },
  {
    eyebrow: "Finanças",
    title: "Saiba quanto sobrou no fim do mês",
    text: "Faturamento, despesas e lucro em gráficos simples. Contas fixas, como aluguel e salários, são lançadas sozinhas todo mês.",
    bullets: ["Para onde vai cada real", "Comprovantes guardados no lugar certo", "Exporta para planilha em um clique"],
    img: "/screens/financas.webp", alt: "finanças", icon: IconMoney,
  },
  {
    eyebrow: "Ficha técnica",
    title: "Descubra quanto custa cada prato",
    text: "Monte a ficha técnica com os ingredientes do estoque e veja na hora o custo, o lucro e a margem de cada item do cardápio.",
    bullets: ["CMV calculado automaticamente", "Aviso quando a margem fica baixa", "Baixa no estoque a cada venda"],
    img: "/screens/ficha-tecnica.webp", alt: "ficha técnica", icon: IconStock,
  },
  {
    eyebrow: "Equipe",
    title: "Cada pessoa vê só o que precisa",
    text: "Convide a equipe e escolha o cargo de cada um. Crie cargos do seu jeito — Caixa, Garçom, Estoquista — e decida, área por área, o que cada cargo vê ou edita.",
    bullets: ["Cargos prontos e personalizados", "A cozinha vê a cozinha, o contador vê as finanças", "Mudou de ideia? Vale na hora"],
    img: "/screens/cargos.webp", alt: "cargos e permissões", icon: IconTeam,
  },
  {
    eyebrow: "Comandas e ponto",
    title: "O garçom lança a comanda no tablet",
    text: "Abra a mesa, adicione os itens e mande para a cozinha em segundos. Feche a conta com taxa de serviço. E cada pessoa bate o ponto pela própria conta.",
    bullets: ["Todas as comandas abertas à vista", "Quantos pedidos e mesas cada garçom atendeu", "Horas trabalhadas de toda a equipe"],
    img: "/screens/comandas.webp", alt: "comandas", icon: IconTab,
  },
];

const STEPS = [
  { n: "1", title: "Crie sua conta", text: "Leva menos de um minuto. Não pedimos cartão de crédito.", icon: Sparkles },
  { n: "2", title: "Configure em 10 passos", text: "Nome, logo, cores, cardápio e estoque — com dicas em cada etapa. Pode pular o que quiser.", icon: ClipboardList },
  { n: "3", title: "Grátis ou completo", text: `Fique no plano Grátis pelo tempo que quiser, ou libere tudo por ${TRIAL_DAYS} dias sem cartão.`, icon: CircleCheck },
];

const FAQ = [
  { q: "Preciso cadastrar cartão?", a: `Não. O plano Grátis é para sempre, e o teste completo de ${TRIAL_DAYS} dias também é sem cartão.` },
  { q: "O que o plano Grátis inclui?", a: "O painel do restaurante, pedidos com tela da cozinha e um cardápio com até 15 itens, só para você. Comandas, finanças, estoque, equipe, ponto, assistente e integrações ficam nos planos pagos." },
  { q: "O que acontece quando o teste acaba?", a: "Você volta para o plano Grátis automaticamente e seus dados continuam guardados. Quando assinar, tudo volta a ficar liberado." },
  { q: "Sou ruim com tecnologia. Vou conseguir usar?", a: "Sim. O CheffeData foi feito para quem vive o restaurante, não para quem é de TI. Cada número tem uma explicação, e a configuração inicial te guia passo a passo." },
  { q: "Funciona no celular e no tablet?", a: "Sim. Funciona no navegador do computador, do tablet e do celular — a tela da cozinha foi feita para toque." },
  { q: "Já integra com iFood e outros apps?", a: "Ainda não: as integrações com apps de delivery estão em desenvolvimento e dependem da aprovação de cada plataforma. Enquanto isso, você lança esses pedidos em poucos toques e eles seguem o mesmo caminho até a cozinha." },
  { q: "Os garçons conseguem lançar pelo tablet?", a: "Sim. Em “Comandas” o garçom abre a mesa, adiciona os itens e manda para a cozinha. Ele também vê todas as comandas abertas e fecha a conta com taxa de serviço." },
  { q: "Tem ponto eletrônico para a equipe?", a: "Tem. Cada pessoa bate o ponto em “Minha área”, e o dono vê as horas de todos e quantos pedidos cada garçom lançou." },
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
          <CheffeDataLogo />
          <nav className="flex items-center gap-1 sm:gap-2">
            <a href="#recursos" className="hidden rounded-md px-3 py-2 text-sm text-ink-2 hover:text-ink md:block">Recursos</a>
            <Link href="/demo" className="hidden rounded-md px-3 py-2 text-sm text-ink-2 hover:text-ink sm:block">Demo</Link>
            <a href="#como-funciona" className="hidden rounded-md px-3 py-2 text-sm text-ink-2 hover:text-ink lg:block">Como funciona</a>
            <a href="#planos" className="hidden rounded-md px-3 py-2 text-sm font-medium text-brand hover:text-ink md:block">Planos e preços</a>
            <a href="#duvidas" className="hidden rounded-md px-3 py-2 text-sm text-ink-2 hover:text-ink lg:block">Dúvidas</a>
            <Button asChild variant="ghost"><Link href="/login">Entrar</Link></Button>
            <Button asChild variant="primary"><Link href="/signup">Testar grátis</Link></Button>
          </nav>
        </div>
      </header>

      <main>
        {/* ------------------------------------------------------------ hero */}
        <section className="relative mx-auto max-w-7xl px-5 pt-12 sm:pt-16">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] bg-[radial-gradient(50%_60%_at_50%_0%,rgba(52,211,153,0.16),transparent_70%)]" aria-hidden />
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3.5 py-1.5 text-sm font-medium text-brand ring-1 ring-brand/30">
              <Sparkles className="size-4" /> Plano grátis para sempre · teste tudo por {TRIAL_DAYS} dias
            </span>
            <h1 className="mt-6 text-[40px] font-semibold leading-[1.04] tracking-tight sm:text-6xl lg:text-[76px]">
              Todos os pedidos.<br />Toda a operação.<br /><span className="text-gradient">Um único sistema.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-2 sm:text-xl">
              Salão, balcão e delivery caem numa fila só, vão direto para a cozinha e, quando ficam prontos, o caixa e o estoque se atualizam sozinhos.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="xl" variant="primary"><Link href="/signup">Criar conta grátis <ArrowRight /></Link></Button>
              <Button asChild size="xl" variant="secondary"><Link href="/demo"><MousePointerClick /> Experimentar a demo — sem cadastro</Link></Button>
            </div>
            <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-ink-3">
              <li className="flex items-center gap-1.5"><CircleCheck className="size-4 text-good" /> Sem cartão</li>
              <li className="flex items-center gap-1.5"><CircleCheck className="size-4 text-good" /> Sem instalação</li>
              <li className="flex items-center gap-1.5"><CircleCheck className="size-4 text-good" /> 100% em português</li>
              <li className="flex items-center gap-1.5"><CircleCheck className="size-4 text-good" /> Cancele quando quiser</li>
            </ul>
            <a href="#planos" className="mt-5 inline-flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-sm text-ink-2 ring-1 ring-line transition hover:text-ink hover:ring-brand/40">
              Grátis para sempre · planos completos a partir de <strong className="text-ink">R$ {PLANS.find((p) => p.price > 0)!.price}/mês</strong> <ArrowRight className="size-4" />
            </a>
          </div>

          <div className="relative mx-auto mt-12 max-w-6xl pb-6">
            <div className="pointer-events-none absolute -inset-x-10 -top-6 bottom-0 rounded-[3rem] bg-[radial-gradient(60%_60%_at_50%_30%,rgba(52,211,153,0.22),transparent_70%)] blur-2xl" aria-hidden />
            <LiveDashboard className="relative" />
            <p className="mt-3 text-center text-xs text-ink-3">Simulação ao vivo com dados de exemplo. <Link href="/demo" className="font-medium text-brand hover:underline">Quer mexer você mesmo? Abra a demo interativa →</Link></p>
          </div>
        </section>

        {/* ------------------------------------------------------------ flow */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand">Integração de pedidos</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Do aplicativo à cozinha, sem ninguém redigitar nada</h2>
            <p className="mt-4 text-ink-2">Os pedidos do salão, das comandas e do balcão já funcionam hoje. As integrações com apps de delivery estão em desenvolvimento e dependem da aprovação de cada plataforma.</p>
          </div>
          <div className="mt-12"><OrderFlow /></div>
        </section>

        {/* ------------------------------------------------------------ pricing */}
        <section id="planos" className="scroll-mt-20 border-y border-line/70 bg-surface/30 py-20">
          <div className="mx-auto max-w-7xl px-5">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-brand">Planos</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Comece grátis. Cresça quando quiser.</h2>
              <p className="mt-4 text-lg text-ink-2">Use o plano Grátis pelo tempo que quiser, ou teste todas as funções por {TRIAL_DAYS} dias sem cartão. Sem fidelidade — cancele quando quiser.</p>
            </div>
            <div className="mt-14">
              <PricingCards cta={(key) => key === "free" ? (
                <Button asChild variant="secondary" size="lg" className="w-full"><Link href="/signup">Criar conta grátis</Link></Button>
              ) : (
                <Button asChild variant={key === "profissional" ? "primary" : "secondary"} size="lg" className="w-full">
                  <Link href={`/signup?plano=${key}`}>Testar {TRIAL_DAYS} dias grátis</Link>
                </Button>
              )} />
            </div>
            <div className="mt-10"><PlanComparison /></div>
            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-ink-3">
              <span className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-brand" /> Dados protegidos</span>
              <span className="flex items-center gap-1.5"><Smartphone className="size-4 text-brand" /> Funciona em qualquer aparelho</span>
              <span className="flex items-center gap-1.5"><CircleCheck className="size-4 text-brand" /> Sem taxa de instalação</span>
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
          <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-surface p-6 shadow-card">
              <p className="flex items-center gap-2 font-semibold text-ink-2"><X className="size-5 text-bad" /> Sem o CheffeData</p>
              <ul className="mt-5 flex flex-col gap-4">
                {BEFORE.map((b) => (
                  <li key={b.text} className="flex gap-3 text-ink-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-bad-soft text-bad"><b.icon className="size-4" /></span><span className="pt-1.5 text-sm">{b.text}</span></li>
                ))}
              </ul>
            </div>
            <div className="glow-ring rounded-2xl bg-surface p-6 shadow-card">
              <p className="flex items-center gap-2 font-semibold"><CircleCheck className="size-5 text-good" /> Com o CheffeData</p>
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
            <p className="mt-4 text-ink-2">Estas são telas de verdade do CheffeData, com dados de exemplo.</p>
          </div>
          <div className="mt-16 flex flex-col gap-24">
            {SHOWCASE.map((s, i) => (
              <div key={s.title} className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1.35fr]">
                <div className={i % 2 ? "lg:order-2" : ""}>
                  <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand"><s.icon className="size-3.5" /> {s.eyebrow}</span>
                  <h3 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">{s.title}</h3>
                  <p className="mt-4 leading-relaxed text-ink-2">{s.text}</p>
                  <ul className="mt-6 flex flex-col gap-2.5">
                    {s.bullets.map((b) => <li key={b} className="flex items-center gap-2.5 text-sm"><CircleCheck className="size-4 shrink-0 text-good" />{b}</li>)}
                  </ul>
                </div>
                <div className={i % 2 ? "relative lg:order-1" : "relative"}>
                  <div className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-[radial-gradient(60%_60%_at_50%_50%,rgba(45,212,191,0.16),transparent_70%)] blur-2xl" aria-hidden />
                  <BrowserFrame src={s.img} alt={s.alt} className="relative" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------ more */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: IconClock, title: "Ponto eletrônico", text: "A equipe bate o ponto no celular. Você vê as horas de todos." },
              { icon: MonitorSmartphone, title: "Computador, tablet e celular", text: "Abra no navegador de qualquer aparelho. Nada para instalar." },
              { icon: Sparkles, title: "Com a cara do seu restaurante", text: "Seu logo, suas cores e o painel organizado do seu jeito." },
              { icon: BellRing, title: "Avisos que ajudam", text: "Estoque acabando, contas vencendo e gastos fora do normal." },
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
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand">Comece hoje</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Em 5 minutos o seu restaurante está no CheffeData</h2>
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
              <div className="pointer-events-none absolute -inset-10 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(52,211,153,0.22),transparent_70%)] blur-2xl" aria-hidden />
              <PhoneFrame src="/screens/celular-cozinha.webp" alt="tela da cozinha no celular" className="relative -rotate-2" />
            </div>
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
            <p className="relative mx-auto mt-4 max-w-lg text-lg opacity-80">Crie sua conta grátis agora e teste tudo por {TRIAL_DAYS} dias, sem cartão. Planos completos a partir de R$ {PLANS.find((p) => p.price > 0)!.price}/mês.</p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Button asChild size="xl" className="relative bg-[#04140c] text-white shadow-none hover:bg-[#04140c]/90"><Link href="/signup">Criar conta grátis <ArrowRight /></Link></Button><Button asChild size="xl" variant="ghost" className="relative text-[#04140c] hover:bg-white/20"><Link href="/demo">Ver a demo</Link></Button></div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-ink-3">
          <CheffeDataLogo />
          <nav className="flex gap-5"><a href="#recursos" className="hover:text-ink">Recursos</a><a href="#planos" className="hover:text-ink">Planos</a><a href="#duvidas" className="hover:text-ink">Dúvidas</a><Link href="/login" className="hover:text-ink">Entrar</Link></nav>
          <span>© {new Date().getFullYear()} CheffeData · Todos os pedidos. Toda a operação. Um único sistema.</span>
        </div>
      </footer>
    </div>
  );
}
