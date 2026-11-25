import type { Restaurant } from "@/lib/types";

export const TRIAL_DAYS = 7;

export interface Plan {
  key: "free" | "essencial" | "profissional" | "rede";
  name: string;
  price: number; // BRL per month
  tagline: string;
  highlight?: boolean;
  limits: string[];
  features: string[];
}

export const PLANS: Plan[] = [
  {
    key: "free",
    name: "Grátis",
    price: 0,
    tagline: "Para conhecer o CheffeData com o seu restaurante, sem pagar nada.",
    limits: ["1 restaurante", "Só você (1 usuário)", "Até 15 itens no cardápio"],
    features: ["Painel do restaurante", "Pedidos e tela da cozinha", "Cardápio simples"],
  },
  {
    key: "essencial",
    name: "Essencial",
    price: 99,
    tagline: "Para quem está organizando o restaurante pela primeira vez.",
    limits: ["1 restaurante", "Até 3 usuários", "1 app de delivery integrado"],
    features: ["Pedidos, comandas e tela da cozinha", "Ponto eletrônico da equipe", "Cardápio com ficha técnica", "Estoque com alertas", "Finanças e contas fixas"],
  },
  {
    key: "profissional",
    name: "Profissional",
    price: 199,
    tagline: "Para restaurantes com equipe e várias frentes de venda.",
    highlight: true,
    limits: ["1 restaurante", "Até 15 usuários", "Apps de delivery ilimitados"],
    features: ["Tudo do Essencial", "Assistente IA com os dados do seu restaurante", "Desempenho de cada garçom", "Cargos personalizados", "Vários layouts de painel", "Suporte prioritário"],
  },
  {
    key: "rede",
    name: "Rede",
    price: 399,
    tagline: "Para grupos e franquias com mais de uma unidade.",
    limits: ["Até 5 restaurantes", "Usuários ilimitados", "Apps de delivery ilimitados"],
    features: ["Tudo do Profissional", "Painel com todas as unidades juntas", "Comparação de faturamento e lucro entre unidades", "Troca rápida entre unidades", "Acompanhamento na implantação"],
  },
];

/** What each plan unlocks. The free trial unlocks everything so owners can try it all. */
export function planAllows(plan: string, feature: "staff_performance" | "custom_roles" | "all_units" | "assistant") {
  if (plan === "trial" || plan === "rede") return true;
  if (plan === "profissional") return feature !== "all_units";
  return false;
}

export const planName = (key: string) =>
  key === "trial" ? "Teste grátis" : PLANS.find((p) => p.key === key)?.name ?? key;

/** The plan in force now: an expired trial falls back to the free plan (same rule as the database). */
export function effectivePlan(r: { plan: string; trial_ends_at?: string | null; is_demo?: boolean }) {
  if (r.is_demo) return "rede";
  if (r.plan === "trial" && r.trial_ends_at && new Date(r.trial_ends_at).getTime() < Date.now()) return "free";
  return r.plan;
}

/** App areas that the free plan does not include. */
export const FREE_LOCKED = ["/comandas", "/finances", "/inventory", "/suppliers", "/team", "/analytics", "/assistant", "/integrations", "/unidades"] as const;

/** Areas of the app that the current plan does not include (by URL). */
export function lockedAreas(plan: string): string[] {
  if (plan === "free") return [...FREE_LOCKED, "/ponto"];
  const locked: string[] = [];
  if (!planAllows(plan, "assistant")) locked.push("/assistant");
  if (!planAllows(plan, "all_units")) locked.push("/unidades");
  return locked;
}

export const AREA_INFO: Record<string, { name: string; pitch: string }> = {
  "/comandas": { name: "Comandas", pitch: "Garçons abrem a mesa no tablet, lançam os itens e fecham a conta com taxa de serviço." },
  "/finances": { name: "Finanças", pitch: "Veja quanto entrou, quanto saiu e quanto sobrou — com contas fixas lançadas sozinhas." },
  "/inventory": { name: "Estoque", pitch: "O estoque baixa sozinho a cada venda e avisa antes de faltar." },
  "/suppliers": { name: "Fornecedores", pitch: "Fornecedores e pedidos de compra num só lugar." },
  "/team": { name: "Equipe", pitch: "Convide a equipe, controle o ponto com selfie e veja o desempenho de cada garçom." },
  "/analytics": { name: "Relatórios", pitch: "Relatórios de vendas, custos e tendências." },
  "/assistant": { name: "Assistente IA", pitch: "Pergunte “quanto lucrei este mês?” e receba a resposta com os seus números." },
  "/integrations": { name: "Integrações", pitch: "Receba pedidos dos apps de delivery na mesma fila da cozinha." },
  "/unidades": { name: "Todas as unidades", pitch: "Acompanhe vários restaurantes lado a lado." },
  "/ponto": { name: "Ponto eletrônico", pitch: "A equipe bate o ponto com selfie e você vê as horas de todos." },
};

export function trialStatus(r: Pick<Restaurant, "plan" | "is_demo"> & { trial_ends_at?: string | null }) {
  if (r.is_demo || r.plan !== "trial") return { onTrial: false, expired: false, daysLeft: 0 };
  const ends = r.trial_ends_at ? new Date(r.trial_ends_at).getTime() : Date.now() + TRIAL_DAYS * 86400000;
  const msLeft = ends - Date.now();
  return { onTrial: true, expired: msLeft <= 0, daysLeft: Math.max(0, Math.ceil(msLeft / 86400000)) };
}

/** Optional contact (WhatsApp link, e-mail or page) used until online payment is set up. */
export const SALES_CONTACT = process.env.NEXT_PUBLIC_SALES_CONTACT ?? "";

export const formatBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

/** Assistant messages per restaurant per day. */
export function assistantDailyLimit(plan: string) {
  return plan === "rede" ? 200 : plan === "profissional" ? 80 : plan === "trial" ? 30 : 0;
}

/** Which plan first includes an area, for upgrade messages. */
export function minimumPlanFor(area: string) {
  if (area === "/unidades") return "Rede";
  if (area === "/assistant") return "Profissional";
  return "Essencial";
}
