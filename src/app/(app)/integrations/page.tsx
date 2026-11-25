import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { IntegrationsGrid } from "@/components/settings/integrations-grid";
import { INTEGRATION_PROVIDERS, availability } from "@/lib/integrations/registry";

export const metadata = { title: "Integrations" };

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
      <PageHeader title="Integrations" description="Connect delivery, payment and POS platforms so every order lands in one place." />
      <IntegrationsGrid providers={providers} simulatedCount={simulated ?? 0} canEdit={ws.permissions.integrations.edit} canCreateOrders={ws.permissions.orders.edit} locale={ws.restaurant.locale} timezone={ws.restaurant.timezone} />
    </div>
  );
}
