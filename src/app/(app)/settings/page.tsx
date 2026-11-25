import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsView } from "@/components/settings/settings-view";
import type { AppRole } from "@/lib/types";

export const metadata = { title: "Configurações" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const ws = await requireWorkspace("settings");
  const { tab } = await searchParams;
  const supabase = await createClient();
  const rid = ws.restaurant.id;
  const canTeam = ws.permissions.team.edit;
  const [{ data: members }, { data: invitations }, { data: permissions }, { data: customRoles }, { data: customPerms }] = await Promise.all([
    supabase.from("restaurant_members").select("id, user_id, role, custom_role_id, status, created_at").eq("restaurant_id", rid).order("created_at"),
    canTeam ? supabase.from("invitations").select("id, email, role, custom_role_id, token, expires_at, accepted_at, created_at").eq("restaurant_id", rid).is("accepted_at", null).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    supabase.from("role_permissions").select("role, section, can_view, can_edit").eq("restaurant_id", rid),
    supabase.from("custom_roles").select("id, name, description").eq("restaurant_id", rid).order("created_at"),
    supabase.from("custom_role_permissions").select("custom_role_id, section, can_view, can_edit").eq("restaurant_id", rid),
  ]);
  const ids = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
  const { data: emps } = await supabase.from("employees").select("member_id, email").eq("restaurant_id", rid).not("member_id", "is", null);

  return (
    <div>
      <PageHeader title="Configurações" description="Deixe o CheffeData com a cara e o jeito do seu restaurante." />
      <SettingsView
        tab={tab ?? "profile"}
        restaurant={ws.restaurant}
        settings={ws.settings}
        role={ws.role}
        currentUserId={ws.user.id}
        canEdit={ws.permissions.settings.edit}
        canManageTeam={canTeam}
        members={(members ?? []).map((m) => ({
          id: m.id, user_id: m.user_id, role: m.role as AppRole, custom_role_id: (m.custom_role_id as string | null) ?? null, created_at: m.created_at,
          name: profiles?.find((p) => p.id === m.user_id)?.full_name ?? "Pessoa da equipe",
          email: emps?.find((e) => e.member_id === m.id)?.email ?? null,
        }))}
        invitations={(invitations ?? []).map((i) => ({ id: i.id, email: i.email, role: i.role as AppRole, custom_role_id: (i.custom_role_id as string | null) ?? null, expires_at: i.expires_at, url: `${env.siteUrl}/invite/${i.token}` }))}
        permissions={(permissions ?? []).map((p) => ({ roleRef: `base:${p.role}`, section: p.section, can_view: p.can_view, can_edit: p.can_edit }))
          .concat((customPerms ?? []).map((p) => ({ roleRef: `custom:${p.custom_role_id}`, section: p.section, can_view: p.can_view, can_edit: p.can_edit })))}
        customRoles={(customRoles ?? []) as { id: string; name: string; description: string | null }[]}
      />
    </div>
  );
}
