import { FlaskConical } from "lucide-react";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { requireWorkspace } from "@/lib/workspace";
import { roleLabel } from "@/lib/permissions";
import { brandVars } from "@/lib/theme";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ws = await requireWorkspace();
  if (!ws.restaurant.onboarding_completed_at && ws.role === "owner") redirect("/onboarding");
  const r = ws.restaurant;
  const shell = { id: r.id, name: r.name, logo_url: r.logo_url, is_demo: r.is_demo };
  const memberships = ws.memberships.map((m) => ({ restaurant_id: m.restaurant_id, name: m.name, logo_url: m.logo_url }));

  return (
    <div style={brandVars(r.brand_color, r.accent_color) as React.CSSProperties} className="flex min-h-dvh">
      <Sidebar restaurant={shell} memberships={memberships} permissions={ws.permissions} />
      <div className="flex min-w-0 flex-1 flex-col">
        {r.is_demo && (
          <div className="flex items-center justify-center gap-2 bg-accent-soft px-4 py-1.5 text-xs font-medium text-accent">
            <FlaskConical className="size-3.5" /> Demo workspace — all data here is sample data
          </div>
        )}
        <Topbar restaurant={shell} memberships={memberships} permissions={ws.permissions} user={ws.user} roleLabel={roleLabel(ws.role)} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
