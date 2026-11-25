import {
  BarChart3, ChefHat, LayoutDashboard, Package, PlugZap, Receipt, Settings, Sparkles, Truck, UsersRound, UtensilsCrossed,
} from "lucide-react";
import type { Section } from "@/lib/types";

export const NAV: { section: Section; href: string; label: string; icon: typeof LayoutDashboard; soon?: boolean }[] = [
  { section: "overview", href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { section: "orders", href: "/orders", label: "Orders", icon: ChefHat },
  { section: "finances", href: "/finances", label: "Finances", icon: Receipt },
  { section: "inventory", href: "/inventory", label: "Inventory", icon: Package },
  { section: "menu", href: "/menu", label: "Menu", icon: UtensilsCrossed },
  { section: "suppliers", href: "/suppliers", label: "Suppliers", icon: Truck, soon: true },
  { section: "team", href: "/team", label: "Team", icon: UsersRound, soon: true },
  { section: "analytics", href: "/analytics", label: "Analytics", icon: BarChart3, soon: true },
  { section: "assistant", href: "/assistant", label: "AI Assistant", icon: Sparkles, soon: true },
  { section: "integrations", href: "/integrations", label: "Integrations", icon: PlugZap },
  { section: "settings", href: "/settings", label: "Settings", icon: Settings },
];
