import { FlaskConical } from "lucide-react";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { requireWorkspace } from "@/lib/workspace";
import { brandVars } from "@/lib/theme";
import { redirect } from "next/navigation";
import Link from "next/link";
import { trialStatus } from "@/lib/billing";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ws = await requireWorkspace();
  if (!ws.restaurant.onboarding_completed_at && ws.role === "owner") redirect("/onboarding");
  const r = ws.restaurant;
  const trial = trialStatus(r);
  if (trial.expired) redirect("/assinatura");
  const shell = { id: r.id, name: r.name, logo_url: r.logo_url, is_demo: r.is_demo };
  const memberships = ws.memberships.map((m) => ({ restaurant_id: m.restaurant_id, name: m.name, logo_url: m.logo_url }));

  const vars = brandVars(r.brand_color, r.accent_color);
  // Also set on :root so dialogs and menus rendered in portals use the restaurant's colours.
  const rootCss = `:root{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";")}}`;

  return (
    <div style={vars as React.CSSProperties} className="app-glow flex min-h-dvh">
      <style>{rootCss}</style>
      <Sidebar restaurant={shell} memberships={memberships} permissions={ws.permissions} />
      <div className="flex min-w-0 flex-1 flex-col">
        {r.is_demo && (
          <div className="flex items-center justify-center gap-2 border-b border-line bg-accent-soft/70 px-4 py-1.5 text-xs font-medium text-accent">
            <FlaskConical className="size-3.5" /> Restaurante de demonstração — todos os dados aqui são de exemplo
          </div>
        )}
        {trial.onTrial && (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-line bg-brand-soft/60 px-4 py-1.5 text-xs text-ink-2">
            <span>Teste grátis: <strong className="text-brand">{trial.daysLeft} {trial.daysLeft === 1 ? "dia restante" : "dias restantes"}</strong></span>
            <Link href="/assinatura" className="font-medium text-brand underline-offset-4 hover:underline">Ver planos</Link>
          </div>
        )}
        <Topbar restaurant={shell} memberships={memberships} permissions={ws.permissions} user={ws.user} roleLabel={ws.roleName} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
