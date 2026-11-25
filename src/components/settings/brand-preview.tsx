import { BarChart3, ChefHat, LayoutDashboard, Package, Receipt } from "lucide-react";
import { brandVars } from "@/lib/theme";
import { initials } from "@/lib/utils";

/** Miniature of the workspace so owners can see their branding applied live. */
export function BrandPreview({ name, logoUrl, brand, accent }: { name: string; logoUrl: string | null; brand: string; accent: string }) {
  const vars = brandVars(brand, accent) as React.CSSProperties;
  const nav = [
    { icon: LayoutDashboard, label: "Overview", active: true },
    { icon: ChefHat, label: "Orders" },
    { icon: Receipt, label: "Finances" },
    { icon: Package, label: "Inventory" },
    { icon: BarChart3, label: "Analytics" },
  ];
  const bars = [38, 52, 44, 61, 58, 72, 66];
  return (
    <div style={vars} className="overflow-hidden rounded-xl bg-bg shadow-card" aria-label="Branding preview">
      <div className="flex h-64">
        <div className="flex w-36 flex-col gap-0.5 border-r border-line bg-surface p-2.5">
          <div className="mb-2 flex items-center gap-2 px-1">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="size-6 rounded-md object-contain" />
            ) : (
              <span className="flex size-6 items-center justify-center rounded-md bg-brand text-[10px] font-semibold text-brand-foreground">{initials(name || "R")}</span>
            )}
            <span className="truncate text-[11px] font-semibold">{name || "Your restaurant"}</span>
          </div>
          {nav.map((n) => (
            <div key={n.label} className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[10px] ${n.active ? "bg-brand-soft font-medium text-brand" : "text-ink-3"}`}>
              <n.icon className="size-3" /> {n.label}
            </div>
          ))}
        </div>
        <div className="flex-1 p-3">
          <p className="font-display text-sm">Good morning, {name || "your restaurant"}</p>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {["Revenue", "Orders", "Profit"].map((k, i) => (
              <div key={k} className="rounded-md bg-surface p-1.5 shadow-card">
                <p className="text-[8px] text-ink-3">{k}</p>
                <p className="text-[11px] font-semibold tabular">{["$12,480", "486", "$4,210"][i]}</p>
              </div>
            ))}
          </div>
          <div className="mt-1.5 rounded-md bg-surface p-2 shadow-card">
            <div className="flex h-20 items-end gap-1">
              {bars.map((h, i) => <div key={i} className="flex-1 rounded-t-[3px] bg-brand" style={{ height: `${h}%`, opacity: i === bars.length - 1 ? 1 : 0.85 }} />)}
            </div>
          </div>
          <div className="mt-1.5 flex gap-1.5">
            <span className="rounded-md bg-brand px-2 py-1 text-[9px] font-medium text-brand-foreground">New order</span>
            <span className="rounded-md bg-accent-soft px-2 py-1 text-[9px] font-medium text-accent">3 alerts</span>
          </div>
        </div>
      </div>
    </div>
  );
}
