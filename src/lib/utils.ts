import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number | string | null | undefined, currency = "USD", locale = "en-US", compact = false) {
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

export function formatNumber(value: number | string | null | undefined, locale = "en-US", digits = 0) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(Number(value ?? 0));
}

export function formatPercent(value: number | null | undefined, locale = "en-US", digits = 1) {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: digits }).format(value);
}

/** Relative change; null when there is no baseline to compare against. */
export function pctChange(current: number, previous: number): number | null {
  if (!previous) return current ? null : 0;
  return (current - previous) / Math.abs(previous);
}

export function formatQuantity(value: number | string, unit: string, locale = "en-US") {
  const n = Number(value);
  const label = unit === "unit" ? (n === 1 ? "unit" : "units") : unit === "box" ? (n === 1 ? "box" : "boxes") : unit;
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
export function friendlyError(error: { message?: string; code?: string } | null | undefined, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;
  if (error.code === "42501") return error.message?.includes("row-level security") ? "You don't have permission to do that." : (error.message ?? fallback);
  if (error.code === "23505") return "That already exists.";
  if (error.code === "23503") return "This is still used elsewhere, so it can't be removed.";
  if (error.code === "23514") return "Some values are not valid.";
  if (error.code && ["22023", "P0002", "54000", "28000"].includes(error.code)) return error.message ?? fallback;
  return fallback;
}
