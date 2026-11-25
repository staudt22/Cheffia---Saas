import type { OrderSource, OrderStatus } from "@/lib/types";

export const STATUS_META: Record<OrderStatus, { label: string; tone: "info" | "accent" | "warn" | "good" | "neutral" | "bad"; next?: OrderStatus; action?: string }> = {
  new: { label: "New", tone: "info", next: "accepted", action: "Accept" },
  accepted: { label: "Accepted", tone: "accent", next: "preparing", action: "Start preparing" },
  preparing: { label: "Preparing", tone: "warn", next: "ready", action: "Mark ready" },
  ready: { label: "Ready", tone: "good", next: "completed", action: "Complete" },
  completed: { label: "Completed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "bad" },
};

export const ACTIVE_STATUSES: OrderStatus[] = ["new", "accepted", "preparing", "ready"];

export const SOURCE_META: Record<OrderSource, { label: string; color: string }> = {
  website: { label: "Website", color: "#4b5563" },
  manual: { label: "Manual", color: "#6b665e" },
  pos: { label: "POS", color: "#1f1d1a" },
  ifood: { label: "iFood", color: "#ea1d2c" },
  ubereats: { label: "Uber Eats", color: "#06c167" },
  doordash: { label: "DoorDash", color: "#ff3008" },
  other: { label: "Other", color: "#8a857b" },
};

export const FULFILLMENT_LABEL = { dine_in: "Dine-in", takeaway: "Takeaway", delivery: "Delivery" } as const;
