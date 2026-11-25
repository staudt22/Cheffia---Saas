"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Lock, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NAV } from "@/components/app/nav";
import { WorkspaceSwitcher } from "@/components/app/workspace-switcher";
import { cn } from "@/lib/utils";
import type { PermissionMap } from "@/lib/permissions";

export interface ShellRestaurant { id: string; name: string; logo_url: string | null; is_demo: boolean; plan?: string; locked?: string[] }
export interface ShellMembership { restaurant_id: string; name: string; logo_url: string | null; is_demo?: boolean }

export function NavLinks({ permissions, collapsed, onNavigate, locked = [] }: { permissions: PermissionMap; collapsed?: boolean; onNavigate?: () => void; locked?: string[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Principal">
      {NAV.filter((n) => (n.section ? permissions[n.section].view : true)).map((n) => {
        const active = pathname === n.href || (pathname.startsWith(n.href + "/") && !NAV.some((o) => o.href !== n.href && o.href.startsWith(n.href) && pathname.startsWith(o.href)));
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            title={collapsed ? n.label : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors",
              active ? "bg-brand-soft font-medium text-brand" : "text-ink-2 hover:bg-surface-3 hover:text-ink",
              collapsed && "justify-center px-0",
            )}
          >
            {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand shadow-[0_0_10px_2px_var(--brand-glow)]" aria-hidden />}
            <n.icon className={cn("size-[18px] shrink-0", active ? "text-brand" : "text-ink-3 group-hover:text-ink-2")} />
            {!collapsed && <span className="truncate">{n.label}</span>}
            {!collapsed && !n.soon && locked.includes(n.href) && <Lock className="ml-auto size-3.5 text-ink-3" aria-label="Disponível em planos pagos" />}
            {!collapsed && n.soon && <span className="ml-auto rounded px-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-3 ring-1 ring-line-strong">Em breve</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ restaurant, memberships, permissions }: { restaurant: ShellRestaurant; memberships: ShellMembership[]; permissions: PermissionMap }) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    // Client-only preference; read after mount to keep hydration consistent.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { setCollapsed(localStorage.getItem("cheffedata.sidebar") === "collapsed"); } catch {}
  }, []);
  function toggle() {
    setCollapsed((c) => {
      try { localStorage.setItem("cheffedata.sidebar", c ? "open" : "collapsed"); } catch {}
      return !c;
    });
  }
  return (
    <aside className={cn("sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface/70 backdrop-blur-xl transition-[width] duration-200 lg:flex", collapsed ? "w-[60px]" : "w-60")}>
      <div className={cn("flex h-14 items-center border-b border-line", collapsed ? "justify-center px-2" : "px-3")}>
        <WorkspaceSwitcher restaurant={restaurant} memberships={memberships} collapsed={collapsed} />
      </div>
      <div className="flex-1 overflow-y-auto p-2"><NavLinks permissions={permissions} locked={restaurant.locked} collapsed={collapsed} /></div>
      <div className="border-t border-line p-2">
        <button onClick={toggle} className={cn("flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-xs text-ink-3 hover:bg-surface-3 hover:text-ink", collapsed && "justify-center px-0")} aria-label={collapsed ? "Expandir menu" : "Recolher menu"}>
          {collapsed ? <PanelLeftOpen className="size-4" /> : <><PanelLeftClose className="size-4" /> Recolher</>}
        </button>
      </div>
    </aside>
  );
}
