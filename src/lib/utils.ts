import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number | string | null | undefined, currency = "BRL", locale = "pt-BR", compact = false) {
  const value = Number(amount ?? 0);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: compact && Math.abs(value) >= 10000 ? "compact" : "standard",
      maximumFractionDigits: compact && Math.abs(value) >= 10000 ? 1 : 2,
      minimumFractionDigits: compact && Math.abs(value) >= 10000 ? 0 : 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatNumber(value: number | string | null | undefined, locale = "pt-BR", digits = 0) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(Number(value ?? 0));
}

export function formatPercent(value: number | null | undefined, locale = "pt-BR", digits = 1) {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: digits }).format(value);
}

/** Relative change; null when there is no baseline to compare against. */
export function pctChange(current: number, previous: number): number | null {
  if (!previous) return current ? null : 0;
  return (current - previous) / Math.abs(previous);
}

export function formatQuantity(value: number | string, unit: string, locale = "pt-BR") {
  const n = Number(value);
  const label = unit === "unit" ? (n === 1 ? "unidade" : "unidades") : unit === "box" ? (n === 1 ? "caixa" : "caixas") : unit === "l" ? "L" : unit;
  return `${formatNumber(n, locale, 2)} ${label}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Turns a Postgres/Supabase error into something a restaurant owner can read. */
export function friendlyError(error: { message?: string; code?: string } | null | undefined, fallback = "Algo deu errado. Tente novamente.") {
  if (!error) return fallback;
  if (error.code === "42501") return translateDbMessage(error.message) ?? (error.message?.includes("row-level security") ? "Você não tem permissão para fazer isso." : error.message ?? fallback);
  if (error.code === "23505") return "Isso já existe.";
  if (error.code === "23503") return "Este item ainda está sendo usado em outro lugar e não pode ser removido.";
  if (error.code === "23514") return "Alguns valores não são válidos.";
  if (error.code && ["22023", "P0002", "54000", "28000"].includes(error.code)) return translateDbMessage(error.message) ?? error.message ?? fallback;
  return fallback;
}

const DB_MESSAGES: [RegExp, string][] = [
  [/^Not authenticated/, "Sua sessão expirou. Entre novamente."],
  [/^Restaurant name is required/, "Informe o nome do restaurante."],
  [/^Workspace limit reached/, "Você atingiu o limite de restaurantes."],
  [/^This invitation is invalid or has expired/, "Este convite é inválido ou expirou."],
  [/^This invitation was sent to a different email address/, "Este convite foi enviado para outro e-mail."],
  [/^Only the owner can change roles/, "Só o dono pode mudar cargos."],
  [/^You cannot change your own role/, "Você não pode mudar o seu próprio cargo."],
  [/^Only the owner can remove members/, "Só o dono pode remover pessoas."],
  [/^The owner cannot be removed/, "O dono não pode ser removido."],
  [/^You do not have permission to create orders/, "Você não tem permissão para criar pedidos."],
  [/^An order needs at least one item/, "O pedido precisa de pelo menos um item."],
  [/^One or more items are unavailable or invalid/, "Um ou mais itens estão indisponíveis."],
  [/^Invalid initial status/, "Status inicial inválido."],
  [/^A cancelled order cannot be reopened/, "Um pedido cancelado não pode ser reaberto."],
  [/^Cross-restaurant reference rejected/, "Esse item pertence a outro restaurante."],
  [/^restaurant_id cannot be changed/, "Não é possível mover dados entre restaurantes."],
  [/^Inventory item does not belong/, "Esse item de estoque pertence a outro restaurante."],
  [/^Billing fields can only be changed/, "O plano só pode ser alterado pela equipe do CheffeData."],
  [/^Demo data can only be added/, "Dados de exemplo só podem ser criados num restaurante de demonstração."],
  [/^Only the owner can seed demo data/, "Só o dono pode criar dados de exemplo."],
  [/^This demo workspace already has data/, "Este restaurante de demonstração já tem dados."],
  [/^Invalid bucket/, "Agrupamento inválido."],
];

/** Translates known database messages to Portuguese. */
export function translateDbMessage(message?: string | null) {
  if (!message) return null;
  return DB_MESSAGES.find(([re]) => re.test(message))?.[1] ?? null;
}
