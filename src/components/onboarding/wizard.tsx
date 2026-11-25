"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CheffeDataLogo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { BrandPreview } from "@/components/settings/brand-preview";
import { ColorField } from "@/components/settings/color-field";
import { ImageUpload } from "@/components/settings/logo-upload";
import { updateRestaurant } from "@/lib/actions/restaurant";
import {
  addInventoryItemsAction, addMenuItemsAction, applyDashboardPresetAction, createDemoWorkspaceAction,
  createRestaurantAction, inviteMembersAction, setOnboardingStepAction,
} from "@/app/onboarding/actions";
import { DASHBOARD_PRESETS, type PresetKey } from "@/lib/dashboard/widgets";
import { INTEGRATION_PROVIDERS } from "@/lib/integrations/registry";
import { BRAND_PRESETS, isValidHex } from "@/lib/theme";
import { CURRENCIES, DATE_FORMATS, LOCALES, RESTAURANT_TYPES, UNITS, UNIT_LABELS } from "@/lib/validation";
import { ROLES } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { Restaurant } from "@/lib/types";

const STEPS = [
  { n: 1, title: "Conta" },
  { n: 2, title: "Restaurante" },
  { n: 3, title: "Identidade" },
  { n: 4, title: "Tipo" },
  { n: 5, title: "Região" },
  { n: 6, title: "Cardápio" },
  { n: 7, title: "Estoque" },
  { n: 8, title: "Equipe" },
  { n: 9, title: "Integrações" },
  { n: 10, title: "Painel" },
];

function StepShell({ title, description, children, footer }: { title: string; description: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="animate-slide-up">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-[15px] text-ink-2">{description}</p>
      <div className="mt-8">{children}</div>
      <div className="mt-10 flex items-center justify-between gap-3 border-t border-line pt-5">{footer}</div>
    </div>
  );
}

export function OnboardingWizard({
  restaurant, userName, initialStep, demoFirst,
}: { restaurant: Restaurant | null; userName: string; initialStep: number; demoFirst: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [pending, startTransition] = useTransition();
  const [rid, setRid] = useState(restaurant?.id ?? null);

  // Restaurant draft shared across steps
  const [profile, setProfile] = useState({
    name: restaurant?.name ?? "", address: restaurant?.address ?? "", phone: restaurant?.phone ?? "", email: restaurant?.email ?? "",
  });
  const [brand, setBrand] = useState({
    logo_url: restaurant?.logo_url ?? null as string | null,
    brand_color: restaurant?.brand_color ?? "#34D399",
    accent_color: restaurant?.accent_color ?? "#2DD4BF",
  });
  const [type, setType] = useState(restaurant?.restaurant_type ?? "");
  const [region, setRegion] = useState({
    currency: restaurant?.currency ?? "BRL",
    locale: restaurant?.locale ?? "pt-BR",
    timezone: restaurant?.timezone && restaurant.timezone !== "UTC" ? restaurant.timezone : "UTC",
    date_format: restaurant?.date_format ?? "dd/MM/yyyy",
  });
  const [timezones, setTimezones] = useState<string[]>(["UTC"]);
  useEffect(() => {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const list = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [browserTz];
    // Browser-only values (time zones, locale) are read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimezones(list.includes("UTC") ? list : ["UTC", ...list]);
    setRegion((r) => (r.timezone === "UTC" && browserTz ? { ...r, timezone: browserTz } : r));
    const lang = navigator.language;
    void lang;
  }, [restaurant]);

  const [menu, setMenu] = useState([{ name: "", price: "", category: "Pratos principais" }]);
  const [stock, setStock] = useState([{ name: "", quantity: "", unit: "kg", min_quantity: "", unit_cost: "" }]);
  const [invites, setInvites] = useState([{ email: "", role: "manager" as "manager" | "employee" | "accountant" | "kitchen" }]);
  const [inviteLinks, setInviteLinks] = useState<{ email: string; url: string }[]>([]);
  const [preset, setPreset] = useState<PresetKey>("owner");
  const [demoOpen, setDemoOpen] = useState(demoFirst);

  function go(next: number) {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (rid && next >= 3) startTransition(async () => { await setOnboardingStepAction(next); });
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, next?: number) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) { toast.error(res.error ?? "Algo deu errado"); return; }
      if (next) go(next);
    });
  }

  const skip = (next: number) => (
    <Button type="button" variant="ghost" onClick={() => go(next)} disabled={pending}>Pular por enquanto</Button>
  );
  const back = (prev: number) => (
    <Button type="button" variant="ghost" onClick={() => go(prev)} disabled={pending || prev < 2}><ArrowLeft /> Voltar</Button>
  );

  let content: React.ReactNode;
  switch (step) {
    case 2:
      content = (
        <StepShell
          title={`Olá${userName ? `, ${userName.split(" ")[0]}` : ""}! Vamos montar o seu restaurante.`}
          description="Comece pelo básico. Dá para mudar tudo depois em Configurações."
          footer={<>
            <span />
            <Button variant="primary" size="lg" loading={pending} disabled={!profile.name.trim()} onClick={() =>
              run(async () => {
                if (rid) return updateRestaurant({ ...profile, onboarding_step: 3 });
                const res = await createRestaurantAction(profile);
                if (res.ok && res.data) setRid(res.data.id);
                return res;
              }, 3)}
            >Continuar</Button>
          </>}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do restaurante" htmlFor="r-name" className="sm:col-span-2">
              <Input id="r-name" autoFocus value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="ex.: Cantina da Vila" />
            </Field>
            <Field label="Endereço" htmlFor="r-address" className="sm:col-span-2">
              <Input id="r-address" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} placeholder="Rua, número, cidade" />
            </Field>
            <Field label="Telefone / WhatsApp" htmlFor="r-phone">
              <Input id="r-phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            </Field>
            <Field label="E-mail de contato" htmlFor="r-email">
              <Input id="r-email" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            </Field>
          </div>
          {!rid && (
            <Card className={cn("mt-8 p-4", demoOpen && "ring-2 ring-brand/30")}>
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 size-5 shrink-0 text-accent" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">Só quer conhecer?</p>
                  <p className="mt-0.5 text-sm text-ink-3">Crie um restaurante de exemplo, separado, com seis semanas de pedidos, despesas e estoque. Ele fica marcado como demonstração e nunca se mistura com dados reais.</p>
                  <Button className="mt-3" size="sm" loading={pending} onClick={() => {
                    setDemoOpen(true);
                    startTransition(async () => {
                      const res = await createDemoWorkspaceAction({ timezone: region.timezone });
                      if (!res.ok) return void toast.error(res.error);
                      router.replace("/dashboard");
                      router.refresh();
                    });
                  }}>Criar restaurante de exemplo</Button>
                </div>
              </div>
            </Card>
          )}
        </StepShell>
      );
      break;

    case 3:
      content = (
        <StepShell
          title="Deixe com a cara do seu restaurante"
          description="Seu logo e suas cores aparecem em todo o sistema. Os textos continuam fáceis de ler, seja qual for a cor."
          footer={<>{back(2)}<div className="flex gap-2">{skip(4)}<Button variant="primary" size="lg" loading={pending}
            disabled={!isValidHex(brand.brand_color) || !isValidHex(brand.accent_color)}
            onClick={() => run(() => updateRestaurant({ ...brand, onboarding_step: 4 }), 4)}>Continuar</Button></div></>}
        >
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
            <div className="flex flex-col gap-6">
              {rid && <Field label="Logo"><ImageUpload restaurantId={rid} value={brand.logo_url} onChange={(url) => setBrand({ ...brand, logo_url: url })} /></Field>}
              <div>
                <p className="mb-2 text-[13px] font-medium text-ink-2">Comece por uma paleta pronta</p>
                <div className="flex flex-wrap gap-2">
                  {BRAND_PRESETS.map((p) => (
                    <button key={p.name} type="button" onClick={() => setBrand({ ...brand, brand_color: p.brand, accent_color: p.accent })}
                      className={cn("flex items-center gap-2 rounded-full bg-surface py-1 pl-1 pr-3 text-xs shadow-card transition hover:shadow-pop",
                        brand.brand_color.toLowerCase() === p.brand.toLowerCase() && "ring-2 ring-ink/20")}>
                      <span className="flex"><span className="size-5 rounded-full" style={{ background: p.brand }} /><span className="-ml-1.5 size-5 rounded-full ring-2 ring-surface" style={{ background: p.accent }} /></span>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-6">
                <ColorField label="Cor principal" value={brand.brand_color} onChange={(v) => setBrand({ ...brand, brand_color: v })} />
                <ColorField label="Cor de destaque" value={brand.accent_color} onChange={(v) => setBrand({ ...brand, accent_color: v })} />
              </div>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-medium text-ink-2">Prévia ao vivo</p>
              <BrandPreview name={profile.name} logoUrl={brand.logo_url} brand={brand.brand_color} accent={brand.accent_color} />
            </div>
          </div>
        </StepShell>
      );
      break;

    case 4:
      content = (
        <StepShell title="Que tipo de restaurante é o seu?" description="Assim a gente sugere categorias e configurações que fazem sentido."
          footer={<>{back(3)}<div className="flex gap-2">{skip(5)}<Button variant="primary" size="lg" loading={pending} disabled={!type}
            onClick={() => run(() => updateRestaurant({ restaurant_type: type, onboarding_step: 5 }), 5)}>Continuar</Button></div></>}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {RESTAURANT_TYPES.map((t) => (
              <button key={t} type="button" onClick={() => setType(t)} aria-pressed={type === t}
                className={cn("flex h-14 items-center justify-between rounded-lg bg-surface px-4 text-left text-sm font-medium shadow-card transition hover:shadow-pop",
                  type === t && "ring-2 ring-brand")}>
                {t}{type === t && <Check className="size-4 text-brand" />}
              </button>
            ))}
          </div>
        </StepShell>
      );
      break;

    case 5:
      content = (
        <StepShell title="Moeda, idioma e horário" description="Usados em todos os valores, datas e relatórios do CheffeData."
          footer={<>{back(4)}<div className="flex gap-2"><Button variant="primary" size="lg" loading={pending}
            onClick={() => run(() => updateRestaurant({ ...region, onboarding_step: 6 }), 6)}>Continuar</Button></div></>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Moeda" htmlFor="currency">
              <Select id="currency" value={region.currency} onChange={(e) => setRegion({ ...region, currency: e.target.value })}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Formato de números e datas" htmlFor="locale" hint="Ex.: Português (Brasil) mostra R$ 1.234,50 e 24/11/2026.">
              <Select id="locale" value={region.locale} onChange={(e) => setRegion({ ...region, locale: e.target.value })}>
                {LOCALES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </Select>
            </Field>
            <Field label="Fuso horário" htmlFor="tz">
              <Select id="tz" value={region.timezone} onChange={(e) => setRegion({ ...region, timezone: e.target.value })}>
                {timezones.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </Select>
            </Field>
            <Field label="Formato de data" htmlFor="df">
              <Select id="df" value={region.date_format} onChange={(e) => setRegion({ ...region, date_format: e.target.value })}>
                {DATE_FORMATS.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            </Field>
          </div>
        </StepShell>
      );
      break;

    case 6: {
      const valid = menu.filter((m) => m.name.trim() && m.price !== "" && Number(m.price) >= 0);
      content = (
        <StepShell title="Cadastre alguns itens do cardápio" description="Por enquanto, só nome e preço — fotos e fichas técnicas você coloca depois."
          footer={<>{back(5)}<div className="flex gap-2">{skip(7)}<Button variant="primary" size="lg" loading={pending} disabled={!valid.length}
            onClick={() => run(async () => {
              const res = await addMenuItemsAction(valid.map((m) => ({ ...m, price: Number(m.price) })));
              if (res.ok) toast.success(`${res.data?.count} itens adicionados ao cardápio`);
              return res;
            }, 7)}>Salvar e continuar</Button></div></>}>
          <div className="flex flex-col gap-2">
            <div className="hidden grid-cols-[1fr_120px_170px_36px] gap-2 px-1 text-xs font-medium text-ink-3 sm:grid"><span>Item</span><span>Preço (R$)</span><span>Categoria</span></div>
            {menu.map((m, i) => (
              <div key={i} className="grid grid-cols-[1fr_100px_36px] gap-2 sm:grid-cols-[1fr_120px_170px_36px]">
                <Input placeholder="ex.: X-Burger" value={m.name} onChange={(e) => setMenu(menu.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} aria-label="Nome do item" />
                <Input type="number" min={0} step="0.01" placeholder="0.00" value={m.price} onChange={(e) => setMenu(menu.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} aria-label="Preço" />
                <Select className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto" value={m.category} onChange={(e) => setMenu(menu.map((x, j) => (j === i ? { ...x, category: e.target.value } : x)))} aria-label="Categoria">
                  {["Lanches", "Entradas", "Pratos principais", "Bebidas", "Sobremesas"].map((c) => <option key={c}>{c}</option>)}
                </Select>
                <Button variant="ghost" size="icon" onClick={() => setMenu(menu.length > 1 ? menu.filter((_, j) => j !== i) : menu)} aria-label="Remover linha"><Trash2 /></Button>
              </div>
            ))}
            <Button variant="ghost" className="w-fit" onClick={() => setMenu([...menu, { name: "", price: "", category: menu.at(-1)?.category ?? "Pratos principais" }])}><Plus /> Adicionar outro</Button>
          </div>
        </StepShell>
      );
      break;
    }

    case 7: {
      const valid = stock.filter((s) => s.name.trim());
      content = (
        <StepShell title="O que tem no seu estoque?" description="Cadastre os ingredientes principais. O CheffeData avisa quando algum ficar abaixo do mínimo."
          footer={<>{back(6)}<div className="flex gap-2">{skip(8)}<Button variant="primary" size="lg" loading={pending} disabled={!valid.length}
            onClick={() => run(async () => {
              const res = await addInventoryItemsAction(valid.map((s) => ({
                name: s.name, unit: s.unit, quantity: Number(s.quantity || 0), min_quantity: Number(s.min_quantity || 0), unit_cost: Number(s.unit_cost || 0),
              })));
              if (res.ok) toast.success(`${res.data?.count} itens adicionados ao estoque`);
              return res;
            }, 8)}>Salvar e continuar</Button></div></>}>
          <div className="flex flex-col gap-2">
            <div className="hidden grid-cols-[1fr_90px_120px_90px_100px_36px] gap-2 px-1 text-xs font-medium text-ink-3 sm:grid"><span>Ingrediente</span><span>Tem hoje</span><span>Unidade</span><span>Mínimo</span><span>Custo (R$)</span></div>
            {stock.map((s, i) => {
              const set = (patch: Partial<typeof s>) => setStock(stock.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <div key={i} className="grid grid-cols-2 gap-2 rounded-lg bg-surface-2 p-2 sm:grid-cols-[1fr_90px_120px_90px_100px_36px] sm:bg-transparent sm:p-0">
                  <Input className="col-span-2 sm:col-span-1" placeholder="ex.: Carne moída" value={s.name} onChange={(e) => set({ name: e.target.value })} aria-label="Ingrediente" />
                  <Input type="number" min={0} placeholder="0" value={s.quantity} onChange={(e) => set({ quantity: e.target.value })} aria-label="Quantidade em estoque" />
                  <Select value={s.unit} onChange={(e) => set({ unit: e.target.value })} aria-label="Unidade">
                    {UNITS.map((u) => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
                  </Select>
                  <Input type="number" min={0} placeholder="0" value={s.min_quantity} onChange={(e) => set({ min_quantity: e.target.value })} aria-label="Estoque mínimo" />
                  <Input type="number" min={0} step="0.01" placeholder="0.00" value={s.unit_cost} onChange={(e) => set({ unit_cost: e.target.value })} aria-label="Custo por unidade" />
                  <Button variant="ghost" size="icon" onClick={() => setStock(stock.length > 1 ? stock.filter((_, j) => j !== i) : stock)} aria-label="Remover linha"><Trash2 /></Button>
                </div>
              );
            })}
            <Button variant="ghost" className="w-fit" onClick={() => setStock([...stock, { name: "", quantity: "", unit: "kg", min_quantity: "", unit_cost: "" }])}><Plus /> Adicionar outro</Button>
          </div>
        </StepShell>
      );
      break;
    }

    case 8: {
      const valid = invites.filter((i) => /\S+@\S+\.\S+/.test(i.email));
      content = (
        <StepShell title="Convide sua equipe" description="Cada pessoa recebe um cargo. Você decide o que cada cargo pode ver em Configurações → Cargos."
          footer={<>{back(7)}<div className="flex gap-2">{inviteLinks.length ? (
            <Button variant="primary" size="lg" onClick={() => go(9)}>Continuar</Button>
          ) : (<>{skip(9)}<Button variant="primary" size="lg" loading={pending} disabled={!valid.length}
            onClick={() => run(async () => {
              const res = await inviteMembersAction(valid);
              if (res.ok && res.data) setInviteLinks(res.data.links);
              return res;
            })}>Criar convites</Button></>)}</div></>}>
          {inviteLinks.length ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-ink-2">Mande o link para cada pessoa (por WhatsApp, por exemplo). O envio automático por e-mail ainda não está ativo. Os links valem por 14 dias.</p>
              {inviteLinks.map((l) => (
                <div key={l.url} className="flex items-center gap-2 rounded-lg bg-surface p-3 shadow-card">
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium">{l.email}</p><p className="truncate font-mono text-xs text-ink-3">{l.url}</p></div>
                  <Button size="sm" onClick={() => { navigator.clipboard.writeText(l.url); toast.success("Link copiado"); }}><Copy /> Copiar</Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {invites.map((inv, i) => (
                <div key={i} className="grid grid-cols-[1fr_150px_36px] gap-2">
                  <Input type="email" placeholder="nome@email.com" value={inv.email} onChange={(e) => setInvites(invites.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))} aria-label="E-mail" />
                  <Select value={inv.role} onChange={(e) => setInvites(invites.map((x, j) => (j === i ? { ...x, role: e.target.value as typeof inv.role } : x)))} aria-label="Cargo">
                    {ROLES.filter((r) => r.key !== "owner").map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => setInvites(invites.length > 1 ? invites.filter((_, j) => j !== i) : invites)} aria-label="Remover linha"><Trash2 /></Button>
                </div>
              ))}
              <Button variant="ghost" className="w-fit" onClick={() => setInvites([...invites, { email: "", role: "employee" }])}><Plus /> Adicionar outro</Button>
            </div>
          )}
        </StepShell>
      );
      break;
    }

    case 9:
      content = (
        <StepShell title="Conecte suas plataformas" description="Traga os apps de delivery e de pagamento para uma fila de pedidos só."
          footer={<>{back(8)}<Button variant="primary" size="lg" onClick={() => go(10)}>Continuar</Button></>}>
          <div className="grid gap-2 sm:grid-cols-2">
            {INTEGRATION_PROVIDERS.slice(0, 6).map((p) => (
              <div key={p.key} className="flex items-center gap-3 rounded-lg bg-surface p-3 shadow-card">
                <span className="flex size-9 items-center justify-center rounded-md text-xs font-bold text-white" style={{ background: p.color }}>{p.short}</span>
                <div className="min-w-0 flex-1"><p className="text-sm font-medium">{p.name}</p><p className="truncate text-xs text-ink-3">{p.category}</p></div>
                <span className="text-xs text-ink-3">Em breve</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-ink-3">
            Essas conexões precisam ser aprovadas por cada plataforma antes de funcionar. Enquanto isso, você lança os pedidos manualmente em segundos — ou testa o modo demonstração em Integrações.
          </p>
        </StepShell>
      );
      break;

    default:
      content = (
        <StepShell title="Escolha como começar o seu painel" description="Você pode mudar, adicionar e remover quadros quando quiser em “Personalizar painel”."
          footer={<>{back(9)}<Button variant="primary" size="lg" loading={pending}
            onClick={() => startTransition(async () => {
              const a = await applyDashboardPresetAction(preset);
              if (!a.ok) return void toast.error(a.error);
              const b = await setOnboardingStepAction(11, true);
              if (!b.ok) return void toast.error(b.error);
              router.replace("/dashboard?welcome=1");
              router.refresh();
            })}>Ir para o meu painel</Button></>}>
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(DASHBOARD_PRESETS) as PresetKey[]).map((k) => (
              <button key={k} type="button" onClick={() => setPreset(k)} aria-pressed={preset === k}
                className={cn("rounded-xl bg-surface p-4 text-left shadow-card transition hover:shadow-pop", preset === k && "ring-2 ring-brand")}>
                <div className="mb-3 grid grid-cols-4 gap-1">
                  {DASHBOARD_PRESETS[k].widgets.slice(0, 8).map((w) => (
                    <span key={w.id} className={cn("h-4 rounded-sm bg-surface-3", w.size === "lg" && "col-span-3", w.size === "xl" && "col-span-4", w.size === "md" && "col-span-2", preset === k && "bg-brand-muted")} />
                  ))}
                </div>
                <p className="text-sm font-semibold">{DASHBOARD_PRESETS[k].name}</p>
                <p className="mt-0.5 text-xs text-ink-3">{DASHBOARD_PRESETS[k].description}</p>
              </button>
            ))}
          </div>
        </StepShell>
      );
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;
  return (
    <div className="app-glow min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4">
          <CheffeDataLogo />
          <span className="text-sm text-ink-3 tabular">Passo {step} de {STEPS.length} · {STEPS[step - 1]?.title}</span>
        </div>
        <div className="h-0.5 bg-line" role="progressbar" aria-valuemin={1} aria-valuemax={10} aria-valuenow={step}>
          <div className="h-full bg-brand transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <ol className="mb-10 hidden gap-1 sm:flex" aria-label="Etapas">
          {STEPS.map((s) => (
            <li key={s.n} className="flex-1">
              <div className={cn("h-1 rounded-full", s.n < step ? "bg-brand" : s.n === step ? "bg-brand/50" : "bg-line")} />
              <p className={cn("mt-1.5 text-[11px]", s.n === step ? "font-medium text-ink" : "text-ink-3")}>{s.title}</p>
            </li>
          ))}
        </ol>
        {content}
      </main>
    </div>
  );
}
