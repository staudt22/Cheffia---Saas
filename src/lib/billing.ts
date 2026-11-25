import type { Restaurant } from "@/lib/types";

export const TRIAL_DAYS = 7;

export interface Plan {
  key: "essencial" | "profissional" | "rede";
  name: string;
  price: number; // BRL per month
  tagline: string;
  highlight?: boolean;
  limits: string[];
  features: string[];
}

export const PLANS: Plan[] = [
  {
    key: "essencial",
    name: "Essencial",
    price: 99,
    tagline: "Para quem está organizando o restaurante pela primeira vez.",
    limits: ["1 restaurante", "Até 3 usuários"],
    features: ["Pedidos e tela da cozinha", "Cardápio com ficha técnica", "Estoque com alertas", "Finanças e despesas recorrentes", "Dashboard personalizável"],
  },
  {
    key: "profissional",
    name: "Profissional",
    price: 199,
    tagline: "Para restaurantes com equipe e várias frentes de venda.",
    highlight: true,
    limits: ["1 restaurante", "Até 15 usuários"],
    features: ["Tudo do Essencial", "Permissões por cargo", "Vários layouts de dashboard", "Integrações com apps de delivery (quando disponíveis)", "Suporte prioritário"],
  },
  {
    key: "rede",
    name: "Rede",
    price: 399,
    tagline: "Para grupos e franquias com mais de uma unidade.",
    limits: ["Até 5 restaurantes", "Usuários ilimitados"],
    features: ["Tudo do Profissional", "Troca rápida entre unidades", "Relatórios por unidade", "Acompanhamento na implantação"],
  },
];

export const planName = (key: string) =>
  key === "trial" ? "Teste grátis" : PLANS.find((p) => p.key === key)?.name ?? key;

export function trialStatus(r: Pick<Restaurant, "plan" | "is_demo"> & { trial_ends_at?: string | null }) {
  if (r.is_demo || r.plan !== "trial") return { onTrial: false, expired: false, daysLeft: 0 };
  const ends = r.trial_ends_at ? new Date(r.trial_ends_at).getTime() : Date.now() + TRIAL_DAYS * 86400000;
  const msLeft = ends - Date.now();
  return { onTrial: true, expired: msLeft <= 0, daysLeft: Math.max(0, Math.ceil(msLeft / 86400000)) };
}

/** Optional contact (WhatsApp link, e-mail or page) used until online payment is set up. */
export const SALES_CONTACT = process.env.NEXT_PUBLIC_SALES_CONTACT ?? "";

export const formatBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
