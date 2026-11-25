import type { OrderSource, OrderStatus } from "@/lib/types";

export const STATUS_META: Record<OrderStatus, { label: string; tone: "info" | "accent" | "warn" | "good" | "neutral" | "bad"; next?: OrderStatus; action?: string }> = {
  new: { label: "Novo", tone: "info", next: "accepted", action: "Aceitar" },
  accepted: { label: "Aceito", tone: "accent", next: "preparing", action: "Começar preparo" },
  preparing: { label: "Em preparo", tone: "warn", next: "ready", action: "Marcar pronto" },
  ready: { label: "Pronto", tone: "good", next: "completed", action: "Concluir" },
  completed: { label: "Concluído", tone: "neutral" },
  cancelled: { label: "Cancelado", tone: "bad" },
};

export const ACTIVE_STATUSES: OrderStatus[] = ["new", "accepted", "preparing", "ready"];

export const SOURCE_META: Record<OrderSource, { label: string; color: string }> = {
  website: { label: "Site", color: "#4b5563" },
  manual: { label: "Manual", color: "#6b665e" },
  pos: { label: "PDV", color: "#1f1d1a" },
  ifood: { label: "iFood", color: "#ea1d2c" },
  ubereats: { label: "Uber Eats", color: "#06c167" },
  doordash: { label: "DoorDash", color: "#ff3008" },
  other: { label: "Outro", color: "#8a857b" },
};

export const FULFILLMENT_LABEL = { dine_in: "No salão", takeaway: "Para viagem", delivery: "Delivery" } as const;
