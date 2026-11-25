import {
  BarChart3, ChefHat, LayoutDashboard, Package, PlugZap, Receipt, Settings, Sparkles, Truck, UsersRound, UtensilsCrossed,
} from "lucide-react";
import type { Section } from "@/lib/types";

export const NAV: { section: Section; href: string; label: string; icon: typeof LayoutDashboard; soon?: boolean }[] = [
  { section: "overview", href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { section: "orders", href: "/orders", label: "Pedidos", icon: ChefHat },
  { section: "finances", href: "/finances", label: "Finanças", icon: Receipt },
  { section: "inventory", href: "/inventory", label: "Estoque", icon: Package },
  { section: "menu", href: "/menu", label: "Cardápio", icon: UtensilsCrossed },
  { section: "suppliers", href: "/suppliers", label: "Fornecedores", icon: Truck, soon: true },
  { section: "team", href: "/team", label: "Equipe", icon: UsersRound, soon: true },
  { section: "analytics", href: "/analytics", label: "Relatórios", icon: BarChart3, soon: true },
  { section: "assistant", href: "/assistant", label: "Assistente IA", icon: Sparkles, soon: true },
  { section: "integrations", href: "/integrations", label: "Integrações", icon: PlugZap },
  { section: "settings", href: "/settings", label: "Configurações", icon: Settings },
];
