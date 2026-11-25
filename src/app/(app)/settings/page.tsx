import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsView } from "@/components/settings/settings-view";
import type { AppRole } from "@/lib/types";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const ws = await requireWorkspace("settings");
  const { tab } = await searchParams;
  const supabase = await createClient();
  const rid = ws.restaurant.id;
  const canTeam = ws.permissions.team.edit;
  const [{ data: members }, { data: invitations }, { data: permissions }] = await Promise.all([
    supabase.from("restaurant_members").select("id, user_id, role, status, created_at").eq("restaurant_id", rid).order("created_at"),
    canTeam ? supabase.from("invitations").select("id, email, role, token, expires_at, accepted_at, created_at").eq("restaurant_id", rid).is("accepted_at", null).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    supabase.from("role_permissions").select("role, section, can_view, can_edit").eq("restaurant_id", rid),
  ]);
  const ids = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
  const { data: emps } = await supabase.from("employees").select("member_id, email").eq("restaurant_id", rid).not("member_id", "is", null);

  return (
    <div>
      <PageHeader title="Settings" description="Make Forkly look and work the way your restaurant does." />
      <SettingsView
        tab={tab ?? "profile"}
        restaurant={ws.restaurant}
        settings={ws.settings}
        role={ws.role}
        currentUserId={ws.user.id}
        canEdit={ws.permissions.settings.edit}
        canManageTeam={canTeam}
        members={(members ?? []).map((m) => ({
          id: m.id, user_id: m.user_id, role: m.role as AppRole, created_at: m.created_at,
          name: profiles?.find((p) => p.id === m.user_id)?.full_name ?? "Team member",
          email: emps?.find((e) => e.member_id === m.id)?.email ?? null,
        }))}
        invitations={(invitations ?? []).map((i) => ({ ...i, role: i.role as AppRole, url: `${env.siteUrl}/invite/${i.token}` }))}
        permissions={(permissions ?? []) as { role: AppRole; section: string; can_view: boolean; can_edit: boolean }[]}
      />
    </div>
  );
}
