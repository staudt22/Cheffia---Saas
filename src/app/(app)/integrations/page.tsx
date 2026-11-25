import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { IntegrationsGrid } from "@/components/settings/integrations-grid";
import { INTEGRATION_PROVIDERS, availability } from "@/lib/integrations/registry";

export const metadata = { title: "Integrações" };

export default async function IntegrationsPage() {
  const ws = await requireWorkspace("integrations");
  const supabase = await createClient();
  const [{ data: rows }, { count: simulated }] = await Promise.all([
    supabase.from("integrations").select("provider, status, last_sync_at, last_error, connected_at").eq("restaurant_id", ws.restaurant.id),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("restaurant_id", ws.restaurant.id).eq("is_simulated", true),
  ]);
  const providers = INTEGRATION_PROVIDERS.map((p) => {
    const row = rows?.find((r) => r.provider === p.key);
    return { ...p, availability: availability(p), status: row?.status ?? "disconnected", lastSync: row?.last_sync_at ?? null, lastError: row?.last_error ?? null };
  });
  return (
    <div>
      <PageHeader title="Integrações" description="Conecte apps de delivery, pagamento e PDV para todos os pedidos caírem num lugar só." />
      {ws.restaurant.plan === "essencial" && (
        <div className="mb-4 rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-ink-2">
          No plano <strong className="text-ink">Essencial</strong> você integra <strong className="text-ink">1 aplicativo</strong>. Para integrar quantos quiser, <a href="/assinatura" className="font-medium text-brand hover:underline">mude para o Profissional</a>.
        </div>
      )}
      <IntegrationsGrid providers={providers} simulatedCount={simulated ?? 0} canEdit={ws.permissions.integrations.edit} canCreateOrders={ws.permissions.orders.edit} locale={ws.restaurant.locale} timezone={ws.restaurant.timezone} />
    </div>
  );
}
