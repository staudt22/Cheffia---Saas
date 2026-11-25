"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell, Building2, Check, ChefHat, Copy, CreditCard, Crown, Eye, Globe2, KeyRound, LayoutGrid, Lock, Palette, Pencil, Plus,
  ShieldCheck, Sparkles, Trash2, UserCog, Users, Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { BrandPreview } from "@/components/settings/brand-preview";
import { ColorField } from "@/components/settings/color-field";
import { ImageUpload } from "@/components/settings/logo-upload";
import { updateRestaurant } from "@/lib/actions/restaurant";
import { inviteMembersAction } from "@/app/onboarding/actions";
import {
  createCustomRoleAction, deleteCustomRoleAction, removeMemberAction, revokeInvitationAction, updateCustomRoleAction,
  updateMemberRoleAction, updatePermissionAction, updateSettingsAction,
} from "@/app/(app)/settings/actions";
import { resetLayoutAction } from "@/app/(app)/dashboard/actions";
import { createClient } from "@/lib/supabase/client";
import { BRAND_PRESETS, isValidHex } from "@/lib/theme";
import { ROLES, SECTIONS, roleLabel } from "@/lib/permissions";
import { CURRENCIES, DATE_FORMATS, LOCALES, RESTAURANT_TYPES } from "@/lib/validation";
import { planName, trialStatus } from "@/lib/billing";
import { cn, formatMoney } from "@/lib/utils";
import type { AppRole, Restaurant, RestaurantSettings } from "@/lib/types";

const TABS = [
  { key: "profile", label: "Dados do restaurante", icon: Building2 },
  { key: "branding", label: "Logo e cores", icon: Palette },
  { key: "region", label: "Moeda, idioma e horário", icon: Globe2 },
  { key: "operations", label: "Operação", icon: Wrench },
  { key: "dashboard", label: "Painel", icon: LayoutGrid },
  { key: "users", label: "Usuários", icon: Users },
  { key: "roles", label: "Cargos e permissões", icon: ShieldCheck },
  { key: "notifications", label: "Avisos", icon: Bell },
  { key: "billing", label: "Plano", icon: CreditCard },
  { key: "security", label: "Segurança", icon: Lock },
];
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABEL: Record<(typeof DAYS)[number], string> = { mon: "Segunda", tue: "Terça", wed: "Quarta", thu: "Quinta", fri: "Sexta", sat: "Sábado", sun: "Domingo" };

interface Member { id: string; user_id: string; role: AppRole; custom_role_id: string | null; name: string; email: string | null; created_at: string }
interface Invitation { id: string; email: string; role: AppRole; custom_role_id: string | null; url: string; expires_at: string }
interface Perm { roleRef: string; section: string; can_view: boolean; can_edit: boolean }
interface CustomRole { id: string; name: string; description: string | null }

function Section({ title, description, children, footer }: { title: string; description?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <Card className="animate-fade-in">
      <div className="border-b border-line px-5 py-4"><h2 className="text-[15px] font-semibold">{title}</h2>{description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}</div>
      <div className="p-5">{children}</div>
      {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
    </Card>
  );
}

export function SettingsView({ tab, restaurant, settings, role, currentUserId, canEdit, canManageTeam, members, invitations, permissions, customRoles }: {
  tab: string; restaurant: Restaurant; settings: RestaurantSettings; role: AppRole; currentUserId: string; canEdit: boolean; canManageTeam: boolean;
  members: Member[]; invitations: Invitation[]; permissions: Perm[]; customRoles: CustomRole[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const active = TABS.some((t) => t.key === tab) ? tab : "profile";
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success = "Salvo") =>
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
        <Section title="Dados do restaurante" description="Aparecem no sistema e nos relatórios."
          footer={canEdit && <Button variant="primary" loading={pending} onClick={() => run(() => updateRestaurant(profile))}>Salvar alterações</Button>}>
          <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do restaurante" htmlFor="s-name"><Input id="s-name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></Field>
            <Field label="Tipo" htmlFor="s-type">
              <Select id="s-type" value={profile.restaurant_type} onChange={(e) => setProfile({ ...profile, restaurant_type: e.target.value })}>
                <option value="">Não informado</option>{RESTAURANT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Endereço" htmlFor="s-addr" className="sm:col-span-2"><Input id="s-addr" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} /></Field>
            <Field label="Telefone / WhatsApp" htmlFor="s-phone"><Input id="s-phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></Field>
            <Field label="E-mail" htmlFor="s-email"><Input id="s-email" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></Field>
            <Field label="Site ou Instagram" htmlFor="s-web" className="sm:col-span-2"><Input id="s-web" value={profile.website} onChange={(e) => setProfile({ ...profile, website: e.target.value })} placeholder="https://" /></Field>
            <div className="sm:col-span-2">
              <p className="mb-2 text-[13px] font-medium text-ink-2">Horário de funcionamento</p>
              <div className="divide-y divide-line rounded-lg ring-1 ring-line">
                {DAYS.map((d) => {
                  const h = profile.business_hours[d] ?? { open: "11:00", close: "22:00", closed: false };
                  const setH = (p: Partial<typeof h>) => setProfile({ ...profile, business_hours: { ...profile.business_hours, [d]: { ...h, ...p } } });
                  return (
                    <div key={d} className="flex flex-wrap items-center gap-3 px-3 py-2">
                      <span className="w-24 text-sm">{DAY_LABEL[d]}</span>
                      <label className="flex items-center gap-2 text-xs text-ink-3"><Switch checked={!h.closed} onCheckedChange={(c) => setH({ closed: !c })} aria-label={`Abre na ${DAY_LABEL[d]}`} />{h.closed ? "Fechado" : "Aberto"}</label>
                      {!h.closed && <div className="ml-auto flex items-center gap-2"><Input type="time" className="h-8 w-28" value={h.open} onChange={(e) => setH({ open: e.target.value })} aria-label="Abre às" /><span className="text-ink-3">até</span><Input type="time" className="h-8 w-28" value={h.close} onChange={(e) => setH({ close: e.target.value })} aria-label="Fecha às" /></div>}
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
        <Section title="Logo e cores" description="Aparecem em todo o sistema. Os textos continuam fáceis de ler, seja qual for a cor."
          footer={canEdit && <Button variant="primary" loading={pending} disabled={!isValidHex(brand.brand_color) || !isValidHex(brand.accent_color)} onClick={() => run(() => updateRestaurant(brand), "Identidade visual atualizada")}>Salvar</Button>}>
          <div className="grid gap-8 lg:grid-cols-2">
            <fieldset disabled={disabled} className="flex flex-col gap-6">
              <Field label="Logo"><ImageUpload restaurantId={restaurant.id} value={brand.logo_url} onChange={(u) => setBrand({ ...brand, logo_url: u })} /></Field>
              <Field label="Foto de capa"><ImageUpload kind="cover" restaurantId={restaurant.id} value={brand.cover_url} onChange={(u) => setBrand({ ...brand, cover_url: u })} /></Field>
              <div>
                <p className="mb-2 text-[13px] font-medium text-ink-2">Paletas prontas</p>
                <div className="flex flex-wrap gap-2">
                  {BRAND_PRESETS.map((p) => (
                    <button key={p.name} type="button" onClick={() => setBrand({ ...brand, brand_color: p.brand, accent_color: p.accent })} className="flex items-center gap-2 rounded-full bg-surface-2 py-1 pl-1 pr-3 text-xs shadow-card hover:shadow-pop">
                      <span className="flex"><span className="size-5 rounded-full" style={{ background: p.brand }} /><span className="-ml-1.5 size-5 rounded-full ring-2 ring-surface" style={{ background: p.accent }} /></span>{p.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-6">
                <ColorField label="Cor principal" value={brand.brand_color} onChange={(v) => setBrand({ ...brand, brand_color: v })} />
                <ColorField label="Cor de destaque" value={brand.accent_color} onChange={(v) => setBrand({ ...brand, accent_color: v })} />
              </div>
            </fieldset>
            <div><p className="mb-2 text-[13px] font-medium text-ink-2">Prévia ao vivo</p><BrandPreview name={restaurant.name} logoUrl={brand.logo_url} brand={brand.brand_color} accent={brand.accent_color} /></div>
          </div>
        </Section>
      );
      break;

    case "region":
      body = (
        <Section title="Moeda, idioma e horário" description="Valem para todos os valores, datas e relatórios."
          footer={canEdit && <Button variant="primary" loading={pending} onClick={() => run(() => updateRestaurant(region))}>Salvar alterações</Button>}>
          <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2">
            <Field label="Moeda" htmlFor="r-cur" hint={`Exemplo: ${formatMoney(1234.5, region.currency, region.locale)}`}>
              <Select id="r-cur" value={region.currency} onChange={(e) => setRegion({ ...region, currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select>
            </Field>
            <Field label="Formato de números e datas" htmlFor="r-loc">
              <Select id="r-loc" value={region.locale} onChange={(e) => setRegion({ ...region, locale: e.target.value })}>{LOCALES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</Select>
            </Field>
            <Field label="Fuso horário" htmlFor="r-tz" hint="Define o que é “hoje” nos relatórios.">
              <Select id="r-tz" value={region.timezone} onChange={(e) => setRegion({ ...region, timezone: e.target.value })}>{timezones.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}</Select>
            </Field>
            <Field label="Formato de data" htmlFor="r-df">
              <Select id="r-df" value={region.date_format} onChange={(e) => setRegion({ ...region, date_format: e.target.value })}>{DATE_FORMATS.map((d) => <option key={d}>{d}</option>)}</Select>
            </Field>
          </fieldset>
        </Section>
      );
      break;

    case "operations":
      body = (
        <Section title="Operação" description="Como os pedidos e o estoque se comportam."
          footer={canEdit && <Button variant="primary" loading={pending} onClick={() => run(() => updateSettingsAction({ ...ops }))}>Salvar alterações</Button>}>
          <fieldset disabled={disabled} className="flex flex-col gap-5">
            <label className="flex items-start justify-between gap-4">
              <span><span className="block text-sm font-medium">Baixar o estoque quando o pedido for concluído</span><span className="block text-sm text-ink-3">Usa a ficha técnica de cada item. Se um pedido concluído for cancelado, os ingredientes voltam para o estoque.</span></span>
              <Switch checked={ops.inventory_auto_deduct} onCheckedChange={(c) => setOps({ ...ops, inventory_auto_deduct: c })} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tempo de preparo padrão (minutos)" htmlFor="o-prep" hint="Usado quando o item não tem ficha técnica."><Input id="o-prep" type="number" min={1} max={240} value={ops.default_prep_minutes} onChange={(e) => setOps({ ...ops, default_prep_minutes: e.target.value })} /></Field>
              <Field label="Alíquota de imposto (%)" htmlFor="o-tax" hint="Guardada para os relatórios. Os preços já incluem impostos."><Input id="o-tax" type="number" min={0} max={99} step="0.001" value={ops.tax_rate} onChange={(e) => setOps({ ...ops, tax_rate: e.target.value })} /></Field>
            </div>
          </fieldset>
        </Section>
      );
      break;

    case "dashboard":
      body = (
        <Section title="Painel" description="O layout do painel vale para todo o restaurante.">
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-ink-2">No painel, clique em <strong>Personalizar painel</strong> para adicionar, remover, aumentar e reorganizar os quadros, trocar o espaçamento e salvar vários layouts.</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="primary"><Link href="/dashboard">Abrir painel</Link></Button>
              {canEdit && <ResetDashboard />}
            </div>
          </div>
        </Section>
      );
      break;

    case "users":
      body = <UsersSection members={members} invitations={invitations} customRoles={customRoles} role={role} currentUserId={currentUserId} canManage={canManageTeam} />;
      break;

    case "roles":
      body = <RolesSection permissions={permissions} customRoles={customRoles} members={members} isOwner={role === "owner"} />;
      break;

    case "notifications":
      body = (
        <Section title="Avisos" description="Escolha quais avisos aparecem no seu painel. Envio por e-mail e celular está chegando."
          footer={canEdit && <Button variant="primary" loading={pending} onClick={() => run(() => updateSettingsAction({ notifications: notif }))}>Salvar preferências</Button>}>
          <fieldset disabled={disabled} className="flex flex-col divide-y divide-line">
            {[
              ["low_stock", "Estoque baixo e vencimentos", "Quando um item fica abaixo do mínimo ou está para vencer"],
              ["upcoming_bills", "Contas a vencer", "Contas fixas que vencem nos próximos 7 dias"],
              ["unusual_expenses", "Gastos fora do normal", "Despesas bem maiores do que o comum na categoria"],
              ["new_order", "Novos pedidos", "Som na tela da cozinha (ative o som por lá)"],
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

    case "billing": {
      const t = trialStatus(restaurant);
      body = (
        <Section title="Plano" description="Sua assinatura do Forkly.">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-surface-2 p-4">
            <div>
              <p className="text-sm font-semibold">{restaurant.is_demo ? "Restaurante de demonstração" : planName(restaurant.plan)}</p>
              <p className="text-sm text-ink-3">{restaurant.is_demo ? "Restaurantes de exemplo não expiram." : t.onTrial ? `Faltam ${t.daysLeft} ${t.daysLeft === 1 ? "dia" : "dias"} de teste grátis. Todos os recursos estão liberados.` : "Plano ativo."}</p>
            </div>
            {!restaurant.is_demo && <Button asChild variant="primary"><Link href="/assinatura"><Sparkles /> Ver planos</Link></Button>}
          </div>
        </Section>
      );
      break;
    }

    case "security":
      body = <SecuritySection />;
      break;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
      <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0" aria-label="Seções das configurações">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => router.replace(`${pathname}?tab=${t.key}`, { scroll: false })} aria-current={active === t.key ? "page" : undefined}
            className={cn("flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm transition", active === t.key ? "bg-brand-soft font-medium text-brand" : "text-ink-2 hover:bg-surface-3")}>
            <t.icon className={cn("size-4", active === t.key ? "text-brand" : "text-ink-3")} /> {t.label}
          </button>
        ))}
      </nav>
      <div className="min-w-0">{!canEdit && !["users", "roles", "security", "dashboard", "billing"].includes(active) && <p className="mb-3 rounded-md bg-surface-3 px-3 py-2 text-sm text-ink-2">Você pode ver estas configurações. Só cargos com permissão de edição podem alterá-las.</p>}{body}</div>
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
      if (!data) return void toast.error("Nenhum layout ativo");
      const r = await resetLayoutAction(data.id);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Painel voltou ao layout padrão");
      router.refresh();
    })}>Voltar ao layout padrão</Button>
  );
}

/* ------------------------------------------------------------------ roles */

type Level = "none" | "view" | "edit";
const LEVELS: { value: Level; label: string; icon: typeof Eye }[] = [
  { value: "none", label: "Sem acesso", icon: Lock },
  { value: "view", label: "Só ver", icon: Eye },
  { value: "edit", label: "Ver e editar", icon: Pencil },
];
const ROLE_ICON: Record<string, typeof Crown> = { owner: Crown, manager: UserCog, employee: Users, accountant: CreditCard, kitchen: ChefHat };

function levelOf(p?: Perm): Level { return p?.can_edit ? "edit" : p?.can_view ? "view" : "none"; }

function RolesSection({ permissions, customRoles, members, isOwner }: { permissions: Perm[]; customRoles: CustomRole[]; members: Member[]; isOwner: boolean }) {
  const router = useRouter();
  const [perms, setPerms] = useState(permissions);
  // Keep local state in sync after the server refreshes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setPerms(permissions), [permissions]);
  const [selected, setSelected] = useState<string>("base:manager");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();

  const roles = useMemo(() => [
    { ref: "owner", name: "Dono", description: "Acesso total, incluindo plano e permissões. Não pode ser alterado.", custom: false },
    ...ROLES.filter((r) => r.key !== "owner").map((r) => ({ ref: `base:${r.key}`, name: r.label, description: r.description, custom: false })),
    ...customRoles.map((c) => ({ ref: `custom:${c.id}`, name: c.name, description: c.description ?? "Cargo criado por você", custom: true })),
  ], [customRoles]);
  const current = roles.find((r) => r.ref === selected) ?? roles[1]!;
  const membersOf = (ref: string) => members.filter((m) => (ref === "owner" ? m.role === "owner" : ref.startsWith("custom:") ? `custom:${m.custom_role_id}` === ref : !m.custom_role_id && `base:${m.role}` === ref)).length;
  const accessCount = (ref: string) => (ref === "owner" ? SECTIONS.length : SECTIONS.filter((s) => levelOf(perms.find((p) => p.roleRef === ref && p.section === s.key)) !== "none").length);

  function setLevel(section: string, level: Level) {
    const prev = perms;
    setPerms((ps) => [...ps.filter((p) => !(p.roleRef === current.ref && p.section === section)), { roleRef: current.ref, section, can_view: level !== "none", can_edit: level === "edit" }]);
    start(async () => {
      const r = await updatePermissionAction({ role: current.ref, section, level });
      if (!r.ok) { toast.error(r.error); setPerms(prev); } else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold">Cargos e permissões</p>
          <p className="text-sm text-ink-3">{isOwner ? "1. Escolha um cargo na lista · 2. Defina o que ele pode fazer em cada área. Vale na hora." : "Só o dono pode alterar os cargos."}</p>
        </div>
        {isOwner && <Button variant="primary" onClick={() => setCreateOpen(true)}><Plus /> Criar cargo</Button>}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit p-2">
          <p className="px-2 pb-2 pt-1 text-xs font-medium uppercase tracking-wide text-ink-3">Escolha o cargo</p>
          <div className="lg:hidden">
            <Select value={current.ref} onChange={(e) => setSelected(e.target.value)} aria-label="Cargo" className="h-11">
              {roles.map((r) => <option key={r.ref} value={r.ref}>{r.name}{r.custom ? " (personalizado)" : ""}</option>)}
            </Select>
          </div>
          <ul className="hidden flex-col gap-1 lg:flex" role="listbox" aria-label="Cargos">
            {roles.map((r) => {
              const Icon = r.custom ? Sparkles : ROLE_ICON[r.ref.replace("base:", "")] ?? Users;
              const on = r.ref === current.ref;
              const count = membersOf(r.ref);
              return (
                <li key={r.ref}>
                  <button role="option" aria-selected={on} onClick={() => setSelected(r.ref)}
                    className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition", on ? "bg-brand-soft ring-1 ring-brand/40" : "hover:bg-surface-3")}>
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", on ? "surface-gradient" : "bg-surface-3 text-ink-2")}><Icon className="size-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-sm font-medium", on && "text-brand")}>{r.name}</span>
                      <span className="block text-xs text-ink-3">{count} {count === 1 ? "pessoa" : "pessoas"} · {accessCount(r.ref)} de {SECTIONS.length} áreas</span>
                    </span>
                    {r.custom && <Badge tone="accent">Seu</Badge>}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-3">Editando o cargo</p>
              <h3 className="mt-0.5 text-xl font-semibold"><span className="text-gradient">{current.name}</span></h3>
              <p className="mt-0.5 text-sm text-ink-3">{current.description}</p>
            </div>
            {isOwner && current.custom && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setEditOpen(true)}><Pencil /> Renomear</Button>
                <Button size="sm" variant="danger-ghost" onClick={() => setConfirmDelete(true)}><Trash2 /> Excluir</Button>
              </div>
            )}
          </div>
          {current.ref === "owner" ? (
            <div className="flex items-center gap-3 p-5 text-sm text-ink-2"><Crown className="size-5 shrink-0 text-accent" /> O dono sempre vê e edita tudo — por segurança, esse cargo não pode ser limitado.</div>
          ) : (
            <ul className="divide-y divide-line">
              {SECTIONS.map((s) => {
                const lvl = levelOf(perms.find((p) => p.roleRef === current.ref && p.section === s.key));
                return (
                  <li key={s.key} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0"><p className="text-sm font-medium">{s.label}</p><p className="text-xs text-ink-3">{s.description}</p></div>
                    <div role="radiogroup" aria-label={`Acesso a ${s.label}`} className="inline-flex shrink-0 rounded-lg bg-surface-3 p-0.5">
                      {LEVELS.map((l) => (
                        <button key={l.value} type="button" role="radio" aria-checked={lvl === l.value} disabled={!isOwner || pending}
                          onClick={() => lvl !== l.value && setLevel(s.key, l.value)}
                          className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed",
                            lvl === l.value
                              ? l.value === "none" ? "bg-surface text-ink shadow-sm" : l.value === "view" ? "bg-info-soft text-info shadow-sm" : "bg-good-soft text-good shadow-sm"
                              : "text-ink-3 hover:text-ink-2")}>
                          <l.icon className="size-3.5" />{l.label}
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        {createOpen && <RoleDialog roles={roles.filter((r) => r.ref !== "owner")} onDone={(id) => { setCreateOpen(false); if (id) { setSelected(`custom:${id}`); router.refresh(); } }} />}
      </Dialog>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        {editOpen && current.custom && <RoleDialog roles={[]} edit={{ id: current.ref.slice(7), name: current.name, description: customRoles.find((c) => `custom:${c.id}` === current.ref)?.description ?? "" }} onDone={() => { setEditOpen(false); router.refresh(); }} />}
      </Dialog>
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent size="sm" title={`Excluir o cargo “${current.name}”?`} description={membersOf(current.ref) ? `${membersOf(current.ref)} ${membersOf(current.ref) === 1 ? "pessoa usa este cargo e vai voltar" : "pessoas usam este cargo e vão voltar"} para o cargo Funcionário.` : "Ninguém usa este cargo agora."}
          footer={<><Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</Button><Button variant="danger" loading={pending} onClick={() => start(async () => {
            const r = await deleteCustomRoleAction(current.ref.slice(7));
            if (!r.ok) return void toast.error(r.error);
            toast.success("Cargo excluído"); setConfirmDelete(false); setSelected("base:manager"); router.refresh();
          })}>Excluir cargo</Button></>}><span /></DialogContent>
      </Dialog>
    </div>
  );
}

function RoleDialog({ roles, edit, onDone }: { roles: { ref: string; name: string }[]; edit?: { id: string; name: string; description: string }; onDone: (id?: string) => void }) {
  const [name, setName] = useState(edit?.name ?? "");
  const [description, setDescription] = useState(edit?.description ?? "");
  const [copyFrom, setCopyFrom] = useState("base:employee");
  const [pending, start] = useTransition();
  return (
    <DialogContent size="sm" title={edit ? "Renomear cargo" : "Criar cargo"} description={edit ? undefined : "Ex.: Caixa, Garçom, Estoquista. Depois você ajusta o que ele pode fazer."}
      footer={<><Button variant="ghost" onClick={() => onDone()}>Cancelar</Button><Button variant="primary" loading={pending} disabled={!name.trim()} onClick={() => start(async () => {
        if (edit) {
          const r = await updateCustomRoleAction(edit.id, { name, description });
          if (!r.ok) return void toast.error(r.error);
          toast.success("Cargo atualizado"); onDone();
        } else {
          const r = await createCustomRoleAction({ name, description, copyFrom });
          if (!r.ok) return void toast.error(r.error);
          toast.success("Cargo criado — agora defina as permissões"); onDone(r.data?.id);
        }
      })}>{edit ? "Salvar" : "Criar cargo"}</Button></>}>
      <div className="flex flex-col gap-4">
        <Field label="Nome do cargo" htmlFor="role-name"><Input id="role-name" autoFocus maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="ex.: Caixa" /></Field>
        <Field label="Descrição (opcional)" htmlFor="role-desc"><Textarea id="role-desc" rows={2} maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="ex.: Fecha as contas e lança pedidos do balcão" /></Field>
        {!edit && (
          <Field label="Começar com as permissões de" htmlFor="role-copy" hint="Você pode mudar tudo depois.">
            <Select id="role-copy" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
              <option value="none">Nenhuma (começa sem acesso)</option>
              {roles.map((r) => <option key={r.ref} value={r.ref}>{r.name}</option>)}
            </Select>
          </Field>
        )}
      </div>
    </DialogContent>
  );
}

/* ------------------------------------------------------------------ users */

function RoleSelect({ value, onChange, customRoles, isOwner, label, className }: { value: string; onChange: (v: string) => void; customRoles: CustomRole[]; isOwner: boolean; label: string; className?: string }) {
  return (
    <Select className={className} value={value} aria-label={label} onChange={(e) => onChange(e.target.value)}>
      <optgroup label="Cargos padrão">
        {ROLES.filter((r) => r.key !== "owner" && (isOwner || r.key !== "manager")).map((r) => <option key={r.key} value={`base:${r.key}`}>{r.label}</option>)}
      </optgroup>
      {customRoles.length > 0 && (
        <optgroup label="Seus cargos">
          {customRoles.map((c) => <option key={c.id} value={`custom:${c.id}`}>{c.name}</option>)}
        </optgroup>
      )}
    </Select>
  );
}

function UsersSection({ members, invitations, customRoles, role, currentUserId, canManage }: { members: Member[]; invitations: Invitation[]; customRoles: CustomRole[]; role: AppRole; currentUserId: string; canManage: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("base:employee");
  const [pending, start] = useTransition();
  const isOwner = role === "owner";
  const copy = (url: string) => { navigator.clipboard.writeText(url); toast.success("Link do convite copiado"); };
  const nameOf = (r: AppRole, custom: string | null) => (custom ? customRoles.find((c) => c.id === custom)?.name ?? "Cargo" : roleLabel(r));

  return (
    <div className="flex flex-col gap-4">
      <Section title="Equipe" description={`${members.length} ${members.length === 1 ? "pessoa tem" : "pessoas têm"} acesso a este restaurante.`}>
        <div className="-mx-5 -my-5">
          <Table>
            <thead><tr><Th>Nome</Th><Th>Cargo</Th>{isOwner && <Th />}</tr></thead>
            <tbody>
              {members.map((m) => (
                <Tr key={m.id}>
                  <Td><p className="font-medium">{m.name}{m.user_id === currentUserId && <span className="ml-1.5 text-xs text-ink-3">(você)</span>}</p>{m.email && <p className="text-xs text-ink-3">{m.email}</p>}</Td>
                  <Td>
                    {isOwner && m.role !== "owner" ? (
                      <RoleSelect className="h-8 w-48" label={`Cargo de ${m.name}`} customRoles={customRoles} isOwner value={m.custom_role_id ? `custom:${m.custom_role_id}` : `base:${m.role}`}
                        onChange={(v) => start(async () => { const r = await updateMemberRoleAction(m.id, v); if (!r.ok) toast.error(r.error); else { toast.success("Cargo atualizado"); router.refresh(); } })} />
                    ) : <Badge tone={m.role === "owner" ? "brand" : "neutral"}>{nameOf(m.role, m.custom_role_id)}</Badge>}
                  </Td>
                  {isOwner && <Td className="text-right">{m.role !== "owner" && <Button size="sm" variant="danger-ghost" disabled={pending} onClick={() => start(async () => { const r = await removeMemberAction(m.id); if (!r.ok) toast.error(r.error); else { toast.success("Pessoa removida"); router.refresh(); } })}><Trash2 /> Remover</Button>}</Td>}
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Section>
      {canManage && (
        <Section title="Convidar alguém" description="A pessoa entra com o cargo que você escolher. Copie o link e mande por WhatsApp ou e-mail — o envio automático está chegando.">
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); start(async () => {
            const [kind, id] = inviteRole.split(":");
            const r = await inviteMembersAction([{ email, role: kind === "base" ? id : "employee", custom_role_id: kind === "custom" ? id : null }]);
            if (!r.ok) return void toast.error(r.error);
            if (r.data?.links[0]) copy(r.data.links[0].url);
            setEmail(""); router.refresh();
          }); }}>
            <Input type="email" required placeholder="nome@email.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="E-mail" />
            <RoleSelect className="sm:w-52" label="Cargo" customRoles={customRoles} isOwner={isOwner} value={inviteRole} onChange={setInviteRole} />
            <Button type="submit" variant="primary" loading={pending}>Criar convite</Button>
          </form>
          {invitations.length > 0 && (
            <ul className="mt-4 divide-y divide-line rounded-lg ring-1 ring-line">
              {invitations.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{i.email}</span><span className="block text-xs text-ink-3">{nameOf(i.role, i.custom_role_id)} · {new Date(i.expires_at) < new Date() ? "expirado" : `vale até ${i.expires_at.slice(0, 10).split("-").reverse().join("/")}`}</span></span>
                  <Button size="sm" onClick={() => copy(i.url)}><Copy /> Copiar link</Button>
                  <Button size="sm" variant="ghost" onClick={() => start(async () => { const r = await revokeInvitationAction(i.id); if (!r.ok) toast.error(r.error); else router.refresh(); })}>Cancelar convite</Button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </div>
  );
}

function SecuritySection() {
  const router = useRouter();
  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <Section title="Trocar senha" description="Use pelo menos 8 caracteres."
        footer={<Button variant="primary" loading={pending} disabled={pw.next.length < 8 || pw.next !== pw.confirm} onClick={() => start(async () => {
          const { error } = await createClient().auth.updateUser({ password: pw.next });
          if (error) return void toast.error(error.message);
          toast.success("Senha alterada"); setPw({ next: "", confirm: "" }); setDone(true);
        })}><KeyRound /> Alterar senha</Button>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nova senha" htmlFor="pw1"><Input id="pw1" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
          <Field label="Repita a nova senha" htmlFor="pw2" error={pw.confirm && pw.confirm !== pw.next ? "As senhas não são iguais" : undefined}><Input id="pw2" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
        </div>
        {done && <p className="mt-3 flex items-center gap-1.5 text-sm text-good"><Check className="size-4" /> Sua senha foi alterada.</p>}
      </Section>
      <Section title="Sessões" description="Perdeu um aparelho ou usou um computador emprestado? Saia de todos de uma vez.">
        <Button loading={pending} onClick={() => start(async () => { await createClient().auth.signOut({ scope: "global" }); router.replace("/login"); router.refresh(); })}>Sair de todos os aparelhos</Button>
      </Section>
    </div>
  );
}
