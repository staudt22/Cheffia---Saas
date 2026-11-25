"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Building2, Check, Copy, CreditCard, Globe2, KeyRound, LayoutGrid, Lock, Palette, ShieldCheck, Trash2, Users, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { BrandPreview } from "@/components/settings/brand-preview";
import { ColorField } from "@/components/settings/color-field";
import { ImageUpload } from "@/components/settings/logo-upload";
import { updateRestaurant } from "@/lib/actions/restaurant";
import { inviteMembersAction } from "@/app/onboarding/actions";
import { removeMemberAction, revokeInvitationAction, updateMemberRoleAction, updatePermissionAction, updateSettingsAction } from "@/app/(app)/settings/actions";
import { resetLayoutAction } from "@/app/(app)/dashboard/actions";
import { createClient } from "@/lib/supabase/client";
import { BRAND_PRESETS, isValidHex } from "@/lib/theme";
import { ROLES, SECTIONS, roleLabel } from "@/lib/permissions";
import { CURRENCIES, DATE_FORMATS, LOCALES, RESTAURANT_TYPES } from "@/lib/validation";
import { cn, formatMoney } from "@/lib/utils";
import type { AppRole, Restaurant, RestaurantSettings } from "@/lib/types";

const TABS = [
  { key: "profile", label: "Restaurant profile", icon: Building2 },
  { key: "branding", label: "Branding", icon: Palette },
  { key: "region", label: "Language, currency & time", icon: Globe2 },
  { key: "operations", label: "Operations", icon: Wrench },
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { key: "users", label: "Users", icon: Users },
  { key: "roles", label: "Roles & permissions", icon: ShieldCheck },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "billing", label: "Billing", icon: CreditCard },
  { key: "security", label: "Security", icon: Lock },
];
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABEL: Record<(typeof DAYS)[number], string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };

interface Member { id: string; user_id: string; role: AppRole; name: string; email: string | null; created_at: string }
interface Invitation { id: string; email: string; role: AppRole; url: string; expires_at: string }

function Section({ title, description, children, footer }: { title: string; description?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <Card className="animate-fade-in">
      <div className="border-b border-line px-5 py-4"><h2 className="text-[15px] font-semibold">{title}</h2>{description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}</div>
      <div className="p-5">{children}</div>
      {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
    </Card>
  );
}

export function SettingsView({ tab, restaurant, settings, role, currentUserId, canEdit, canManageTeam, members, invitations, permissions }: {
  tab: string; restaurant: Restaurant; settings: RestaurantSettings; role: AppRole; currentUserId: string; canEdit: boolean; canManageTeam: boolean;
  members: Member[]; invitations: Invitation[]; permissions: { role: AppRole; section: string; can_view: boolean; can_edit: boolean }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const active = TABS.some((t) => t.key === tab) ? tab : "profile";
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success = "Saved") =>
    start(async () => { const r = await fn(); if (!r.ok) toast.error(r.error); else { toast.success(success); router.refresh(); } });

  const [profile, setProfile] = useState({
    name: restaurant.name, address: restaurant.address ?? "", phone: restaurant.phone ?? "", email: restaurant.email ?? "", website: restaurant.website ?? "",
    restaurant_type: restaurant.restaurant_type ?? "", business_hours: restaurant.business_hours ?? {},
  });
  const [brand, setBrand] = useState({ logo_url: restaurant.logo_url, cover_url: restaurant.cover_url, brand_color: restaurant.brand_color, accent_color: restaurant.accent_color });
  const [region, setRegion] = useState({ currency: restaurant.currency, locale: restaurant.locale, timezone: restaurant.timezone, date_format: restaurant.date_format });
  const [ops, setOps] = useState({ inventory_auto_deduct: settings.inventory_auto_deduct, default_prep_minutes: String(settings.default_prep_minutes), tax_rate: String(settings.tax_rate) });
  const [notif, setNotif] = useState(settings.notifications ?? {});
  const [timezones, setTimezones] = useState<string[]>([restaurant.timezone]);
  // Browser-only list, read after mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (typeof Intl.supportedValuesOf === "function") setTimezones(["UTC", ...Intl.supportedValuesOf("timeZone")]); }, []);
  const disabled = !canEdit;

  let body: React.ReactNode = null;
  switch (active) {
    case "profile":
      body = (
        <Section title="Restaurant profile" description="Shown across your workspace and on reports."
          footer={canEdit && <Button variant="primary" loading={pending} onClick={() => run(() => updateRestaurant(profile))}>Save changes</Button>}>
          <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2">
            <Field label="Restaurant name" htmlFor="s-name"><Input id="s-name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></Field>
            <Field label="Type" htmlFor="s-type">
              <Select id="s-type" value={profile.restaurant_type} onChange={(e) => setProfile({ ...profile, restaurant_type: e.target.value })}>
                <option value="">Not set</option>{RESTAURANT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Address" htmlFor="s-addr" className="sm:col-span-2"><Input id="s-addr" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} /></Field>
            <Field label="Phone" htmlFor="s-phone"><Input id="s-phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></Field>
            <Field label="Email" htmlFor="s-email"><Input id="s-email" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></Field>
            <Field label="Website" htmlFor="s-web" className="sm:col-span-2"><Input id="s-web" value={profile.website} onChange={(e) => setProfile({ ...profile, website: e.target.value })} placeholder="https://" /></Field>
            <div className="sm:col-span-2">
              <p className="mb-2 text-[13px] font-medium text-ink-2">Business hours</p>
              <div className="divide-y divide-line rounded-lg ring-1 ring-line">
                {DAYS.map((d) => {
                  const h = profile.business_hours[d] ?? { open: "11:00", close: "22:00", closed: false };
                  const setH = (p: Partial<typeof h>) => setProfile({ ...profile, business_hours: { ...profile.business_hours, [d]: { ...h, ...p } } });
                  return (
                    <div key={d} className="flex flex-wrap items-center gap-3 px-3 py-2">
                      <span className="w-24 text-sm">{DAY_LABEL[d]}</span>
                      <label className="flex items-center gap-2 text-xs text-ink-3"><Switch checked={!h.closed} onCheckedChange={(c) => setH({ closed: !c })} aria-label={`Open on ${DAY_LABEL[d]}`} />{h.closed ? "Closed" : "Open"}</label>
                      {!h.closed && <div className="ml-auto flex items-center gap-2"><Input type="time" className="h-8 w-28" value={h.open} onChange={(e) => setH({ open: e.target.value })} aria-label="Opens" /><span className="text-ink-3">–</span><Input type="time" className="h-8 w-28" value={h.close} onChange={(e) => setH({ close: e.target.value })} aria-label="Closes" /></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </fieldset>
        </Section>
      );
      break;

    case "branding":
      body = (
        <Section title="Branding" description="Your logo and colours appear throughout the workspace. Text always stays readable."
          footer={canEdit && <Button variant="primary" loading={pending} disabled={!isValidHex(brand.brand_color) || !isValidHex(brand.accent_color)} onClick={() => run(() => updateRestaurant(brand), "Branding updated")}>Save branding</Button>}>
          <div className="grid gap-8 lg:grid-cols-2">
            <fieldset disabled={disabled} className="flex flex-col gap-6">
              <Field label="Logo"><ImageUpload restaurantId={restaurant.id} value={brand.logo_url} onChange={(u) => setBrand({ ...brand, logo_url: u })} /></Field>
              <Field label="Cover image"><ImageUpload kind="cover" restaurantId={restaurant.id} value={brand.cover_url} onChange={(u) => setBrand({ ...brand, cover_url: u })} /></Field>
              <div className="flex flex-wrap gap-2">
                {BRAND_PRESETS.map((p) => (
                  <button key={p.name} type="button" onClick={() => setBrand({ ...brand, brand_color: p.brand, accent_color: p.accent })} className="flex items-center gap-2 rounded-full bg-surface py-1 pl-1 pr-3 text-xs shadow-card hover:shadow-pop">
                    <span className="flex"><span className="size-5 rounded-full" style={{ background: p.brand }} /><span className="-ml-1.5 size-5 rounded-full ring-2 ring-surface" style={{ background: p.accent }} /></span>{p.name}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-6">
                <ColorField label="Brand colour" value={brand.brand_color} onChange={(v) => setBrand({ ...brand, brand_color: v })} />
                <ColorField label="Accent colour" value={brand.accent_color} onChange={(v) => setBrand({ ...brand, accent_color: v })} />
              </div>
            </fieldset>
            <div><p className="mb-2 text-[13px] font-medium text-ink-2">Live preview</p><BrandPreview name={restaurant.name} logoUrl={brand.logo_url} brand={brand.brand_color} accent={brand.accent_color} /></div>
          </div>
        </Section>
      );
      break;

    case "region":
      body = (
        <Section title="Language, currency & time" description="Applies to every number, date and report."
          footer={canEdit && <Button variant="primary" loading={pending} onClick={() => run(() => updateRestaurant(region))}>Save changes</Button>}>
          <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2">
            <Field label="Currency" htmlFor="r-cur" hint={`Example: ${formatMoney(1234.5, region.currency, region.locale)}`}>
              <Select id="r-cur" value={region.currency} onChange={(e) => setRegion({ ...region, currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select>
            </Field>
            <Field label="Language & number format" htmlFor="r-loc" hint="The interface is in English for now; formatting follows this setting.">
              <Select id="r-loc" value={region.locale} onChange={(e) => setRegion({ ...region, locale: e.target.value })}>{LOCALES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</Select>
            </Field>
            <Field label="Time zone" htmlFor="r-tz" hint="Used to decide what “today” means for reports.">
              <Select id="r-tz" value={region.timezone} onChange={(e) => setRegion({ ...region, timezone: e.target.value })}>{timezones.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}</Select>
            </Field>
            <Field label="Date format" htmlFor="r-df">
              <Select id="r-df" value={region.date_format} onChange={(e) => setRegion({ ...region, date_format: e.target.value })}>{DATE_FORMATS.map((d) => <option key={d}>{d}</option>)}</Select>
            </Field>
          </fieldset>
        </Section>
      );
      break;

    case "operations":
      body = (
        <Section title="Operations" description="How orders and stock behave."
          footer={canEdit && <Button variant="primary" loading={pending} onClick={() => run(() => updateSettingsAction({ ...ops }))}>Save changes</Button>}>
          <fieldset disabled={disabled} className="flex flex-col gap-5">
            <label className="flex items-start justify-between gap-4">
              <span><span className="block text-sm font-medium">Deduct inventory when orders complete</span><span className="block text-sm text-ink-3">Uses each menu item&apos;s recipe. Cancelling a completed order puts the stock back.</span></span>
              <Switch checked={ops.inventory_auto_deduct} onCheckedChange={(c) => setOps({ ...ops, inventory_auto_deduct: c })} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Default preparation time (minutes)" htmlFor="o-prep" hint="Used when a menu item has no recipe time."><Input id="o-prep" type="number" min={1} max={240} value={ops.default_prep_minutes} onChange={(e) => setOps({ ...ops, default_prep_minutes: e.target.value })} /></Field>
              <Field label="Sales tax rate (%)" htmlFor="o-tax" hint="Stored for reports. Order totals are entered tax-inclusive."><Input id="o-tax" type="number" min={0} max={99} step="0.001" value={ops.tax_rate} onChange={(e) => setOps({ ...ops, tax_rate: e.target.value })} /></Field>
            </div>
          </fieldset>
        </Section>
      );
      break;

    case "dashboard":
      body = (
        <Section title="Dashboard" description="Your layout is saved for the whole restaurant.">
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-ink-2">Use <strong>Customize dashboard</strong> on the Overview page to add, remove, resize and rearrange widgets, switch density, and save multiple layouts.</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="primary"><Link href="/dashboard">Open dashboard</Link></Button>
              {canEdit && <ResetDashboard />}
            </div>
          </div>
        </Section>
      );
      break;

    case "users":
      body = <UsersSection members={members} invitations={invitations} role={role} currentUserId={currentUserId} canManage={canManageTeam} />;
      break;

    case "roles":
      body = <RolesSection permissions={permissions} isOwner={role === "owner"} />;
      break;

    case "notifications":
      body = (
        <Section title="Notifications" description="Choose which alerts appear on your dashboard. Email and push delivery are coming soon."
          footer={canEdit && <Button variant="primary" loading={pending} onClick={() => run(() => updateSettingsAction({ notifications: notif }))}>Save preferences</Button>}>
          <fieldset disabled={disabled} className="flex flex-col divide-y divide-line">
            {[
              ["low_stock", "Low stock & expiring items", "When inventory falls below its minimum or is about to expire"],
              ["upcoming_bills", "Upcoming bills", "Recurring expenses due in the next 7 days"],
              ["unusual_expenses", "Unusual expenses", "Expenses much larger than usual for their category"],
              ["new_order", "New orders", "Chime on the kitchen display (enable sound there)"],
            ].map(([k, t, d]) => (
              <label key={k} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <span><span className="block text-sm font-medium">{t}</span><span className="block text-sm text-ink-3">{d}</span></span>
                <Switch checked={notif[k!] !== false} onCheckedChange={(c) => setNotif({ ...notif, [k!]: c })} />
              </label>
            ))}
          </fieldset>
        </Section>
      );
      break;

    case "billing":
      body = (
        <Section title="Billing" description="Your Forkly plan.">
          <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-2 p-4">
            <div><p className="text-sm font-semibold capitalize">{restaurant.is_demo ? "Demo workspace" : `${restaurant.plan} plan`}</p><p className="text-sm text-ink-3">All features included while Forkly is in early access.</p></div>
            <Badge tone="brand">Active</Badge>
          </div>
          <p className="mt-4 text-sm text-ink-3">Subscription billing (Stripe) is not set up yet, so there is nothing to pay or manage here. You&apos;ll be notified before any plan change.</p>
        </Section>
      );
      break;

    case "security":
      body = <SecuritySection />;
      break;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0" aria-label="Settings sections">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => router.replace(`${pathname}?tab=${t.key}`, { scroll: false })} aria-current={active === t.key ? "page" : undefined}
            className={cn("flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm transition", active === t.key ? "bg-surface font-medium text-ink shadow-card" : "text-ink-2 hover:bg-surface-3")}>
            <t.icon className="size-4 text-ink-3" /> {t.label}
          </button>
        ))}
      </nav>
      <div className="min-w-0">{!canEdit && !["users", "roles", "security", "dashboard", "billing"].includes(active) && <p className="mb-3 rounded-md bg-surface-3 px-3 py-2 text-sm text-ink-2">You can view these settings. Only roles with edit access can change them.</p>}{body}</div>
    </div>
  );
}

function ResetDashboard() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button loading={pending} onClick={() => start(async () => {
      const supabase = createClient();
      const { data } = await supabase.from("dashboard_layouts").select("id").eq("is_active", true).limit(1).maybeSingle();
      if (!data) return void toast.error("No active layout");
      const r = await resetLayoutAction(data.id);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Dashboard reset to the default layout");
      router.refresh();
    })}>Reset to default layout</Button>
  );
}

function UsersSection({ members, invitations, role, currentUserId, canManage }: { members: Member[]; invitations: Invitation[]; role: AppRole; currentUserId: string; canManage: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"manager" | "employee" | "accountant" | "kitchen">("employee");
  const [pending, start] = useTransition();
  const isOwner = role === "owner";
  const copy = (url: string) => { navigator.clipboard.writeText(url); toast.success("Invitation link copied"); };

  return (
    <div className="flex flex-col gap-4">
      <Section title="Team members" description={`${members.length} ${members.length === 1 ? "person has" : "people have"} access to this workspace.`}>
        <div className="-mx-5 -my-5">
          <Table>
            <thead><tr><Th>Name</Th><Th>Role</Th>{isOwner && <Th />}</tr></thead>
            <tbody>
              {members.map((m) => (
                <Tr key={m.id}>
                  <Td><p className="font-medium">{m.name}{m.user_id === currentUserId && <span className="ml-1.5 text-xs text-ink-3">(you)</span>}</p>{m.email && <p className="text-xs text-ink-3">{m.email}</p>}</Td>
                  <Td>
                    {isOwner && m.role !== "owner" ? (
                      <Select className="h-8 w-40" value={m.role} aria-label={`Role for ${m.name}`} onChange={(e) => start(async () => { const r = await updateMemberRoleAction(m.id, e.target.value); if (!r.ok) toast.error(r.error); else { toast.success("Role updated"); router.refresh(); } })}>
                        {ROLES.filter((r) => r.key !== "owner").map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                      </Select>
                    ) : <Badge tone={m.role === "owner" ? "brand" : "neutral"}>{roleLabel(m.role)}</Badge>}
                  </Td>
                  {isOwner && <Td className="text-right">{m.role !== "owner" && <Button size="sm" variant="danger-ghost" disabled={pending} onClick={() => start(async () => { const r = await removeMemberAction(m.id); if (!r.ok) toast.error(r.error); else { toast.success("Member removed"); router.refresh(); } })}><Trash2 /> Remove</Button>}</Td>}
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Section>
      {canManage && (
        <Section title="Invite someone" description="They'll join with the role you choose. Email delivery isn't set up yet — copy the link and send it yourself.">
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); start(async () => {
            const r = await inviteMembersAction([{ email, role: inviteRole }]);
            if (!r.ok) return void toast.error(r.error);
            if (r.data?.links[0]) copy(r.data.links[0].url);
            setEmail(""); router.refresh();
          }); }}>
            <Input type="email" required placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
            <Select className="sm:w-44" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)} aria-label="Role">
              {ROLES.filter((r) => r.key !== "owner" && (isOwner || r.key !== "manager")).map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </Select>
            <Button type="submit" variant="primary" loading={pending}>Create invite</Button>
          </form>
          {invitations.length > 0 && (
            <ul className="mt-4 divide-y divide-line rounded-lg ring-1 ring-line">
              {invitations.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{i.email}</span><span className="block text-xs text-ink-3">{roleLabel(i.role)} · {new Date(i.expires_at) < new Date() ? "expired" : `expires ${i.expires_at.slice(0, 10)}`}</span></span>
                  <Button size="sm" onClick={() => copy(i.url)}><Copy /> Copy link</Button>
                  <Button size="sm" variant="ghost" onClick={() => start(async () => { const r = await revokeInvitationAction(i.id); if (!r.ok) toast.error(r.error); else router.refresh(); })}>Revoke</Button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </div>
  );
}

function RolesSection({ permissions, isOwner }: { permissions: { role: AppRole; section: string; can_view: boolean; can_edit: boolean }[]; isOwner: boolean }) {
  const router = useRouter();
  const [state, setState] = useState(permissions);
  const [, start] = useTransition();
  const roles = ROLES.filter((r) => r.key !== "owner");
  function toggle(role: AppRole, section: string, field: "can_view" | "can_edit", value: boolean) {
    const cur = state.find((p) => p.role === role && p.section === section) ?? { role, section, can_view: false, can_edit: false };
    const next = { ...cur, [field]: value, ...(field === "can_edit" && value ? { can_view: true } : {}), ...(field === "can_view" && !value ? { can_edit: false } : {}) };
    setState((s) => [...s.filter((p) => !(p.role === role && p.section === section)), next]);
    start(async () => {
      const r = await updatePermissionAction(next);
      if (!r.ok) { toast.error(r.error); setState(permissions); } else router.refresh();
    });
  }
  return (
    <Section title="Roles & permissions" description={isOwner ? "Choose what each role can see and change. Owners always have full access. Changes apply immediately." : "Only the owner can change permissions."}>
      <div className="-mx-5 -my-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line"><th className="px-4 py-2 text-left text-xs font-medium text-ink-3">Section</th>{roles.map((r) => <th key={r.key} className="px-3 py-2 text-center text-xs font-medium text-ink-3" title={r.description}>{r.label}</th>)}</tr>
          </thead>
          <tbody>
            {SECTIONS.map((s) => (
              <tr key={s.key} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5"><p className="font-medium">{s.label}</p><p className="text-xs text-ink-3">{s.description}</p></td>
                {roles.map((r) => {
                  const p = state.find((x) => x.role === r.key && x.section === s.key);
                  return (
                    <td key={r.key} className="px-3 py-2.5">
                      <div className="flex flex-col items-center gap-1 text-[11px] text-ink-3">
                        <label className="flex items-center gap-1"><input type="checkbox" className="accent-[var(--brand)]" disabled={!isOwner} checked={!!p?.can_view} onChange={(e) => toggle(r.key, s.key, "can_view", e.target.checked)} /> View</label>
                        <label className="flex items-center gap-1"><input type="checkbox" className="accent-[var(--brand)]" disabled={!isOwner} checked={!!p?.can_edit} onChange={(e) => toggle(r.key, s.key, "can_edit", e.target.checked)} /> Edit</label>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function SecuritySection() {
  const router = useRouter();
  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <Section title="Change password" description="Use at least 8 characters."
        footer={<Button variant="primary" loading={pending} disabled={pw.next.length < 8 || pw.next !== pw.confirm} onClick={() => start(async () => {
          const { error } = await createClient().auth.updateUser({ password: pw.next });
          if (error) return void toast.error(error.message);
          toast.success("Password updated"); setPw({ next: "", confirm: "" }); setDone(true);
        })}><KeyRound /> Update password</Button>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New password" htmlFor="pw1"><Input id="pw1" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
          <Field label="Confirm new password" htmlFor="pw2" error={pw.confirm && pw.confirm !== pw.next ? "Passwords don't match" : undefined}><Input id="pw2" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
        </div>
        {done && <p className="mt-3 flex items-center gap-1.5 text-sm text-good"><Check className="size-4" /> Your password was changed.</p>}
      </Section>
      <Section title="Sessions" description="Sign out everywhere if a device was lost or shared.">
        <Button loading={pending} onClick={() => start(async () => { await createClient().auth.signOut({ scope: "global" }); router.replace("/login"); router.refresh(); })}>Sign out of all devices</Button>
      </Section>
    </div>
  );
}
