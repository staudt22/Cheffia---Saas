"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, ChevronDown, GripVertical, LayoutGrid, Maximize2, Minimize2, Plus, RotateCcw, Save, SlidersHorizontal, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { HIGHLIGHT_WIDGETS, WidgetContent, type Ctx } from "@/components/dashboard/widget-content";
import { activateLayoutAction, createLayoutAction, deleteLayoutAction, saveLayoutAction } from "@/app/(app)/dashboard/actions";
import { DASHBOARD_PRESETS, WIDGETS, newWidgetId, widgetDef, type PresetKey } from "@/lib/dashboard/widgets";
import { cn } from "@/lib/utils";
import type { PermissionMap } from "@/lib/permissions";
import type { DashboardData } from "@/lib/dashboard/data";
import type { DashboardLayout, WidgetInstance } from "@/lib/types";

const SIZE_CLASS: Record<WidgetInstance["size"], string> = {
  sm: "col-span-1",
  md: "col-span-1 md:col-span-2",
  lg: "col-span-1 md:col-span-2 xl:col-span-3",
  xl: "col-span-1 md:col-span-2 xl:col-span-4",
};

function SortableWidget({
  widget, ctx, editing, onRemove, onResize, onConfig,
}: { widget: WidgetInstance; ctx: Ctx; editing: boolean; onRemove: () => void; onResize: (dir: 1 | -1) => void; onConfig: (c: WidgetInstance["config"]) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id, disabled: !editing });
  const def = widgetDef(widget.type);
  const sizes = def?.sizes ?? [widget.size];
  const idx = sizes.indexOf(widget.size);
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(SIZE_CLASS[widget.size], "min-w-0", isDragging && "z-20")}
    >
      <Card className={cn(
        "relative h-full overflow-hidden transition-[box-shadow,transform] duration-200",
        HIGHLIGHT_WIDGETS.has(widget.type) ? "surface-gradient" : "hover:shadow-pop",
        editing && "ring-1 ring-dashed ring-brand/40",
        isDragging && "shadow-pop ring-2 ring-brand",
      )}>
        {editing && (
          <div className="flex items-center gap-1 border-b border-line bg-brand-soft/60 px-2 py-1">
            <button className="flex cursor-grab touch-none items-center gap-1 rounded px-1 py-0.5 text-xs font-medium text-brand active:cursor-grabbing" {...attributes} {...listeners} aria-label={`Arrastar ${def?.title ?? "widget"}`}>
              <GripVertical className="size-3.5" /> {def?.title}
            </button>
            <div className="ml-auto flex items-center gap-0.5">
              {sizes.length > 1 && (
                <>
                  <button className="rounded p-1 text-ink-3 hover:bg-surface hover:text-ink disabled:opacity-30" disabled={idx <= 0} onClick={() => onResize(-1)} aria-label="Diminuir"><Minimize2 className="size-3.5" /></button>
                  <button className="rounded p-1 text-ink-3 hover:bg-surface hover:text-ink disabled:opacity-30" disabled={idx >= sizes.length - 1} onClick={() => onResize(1)} aria-label="Aumentar"><Maximize2 className="size-3.5" /></button>
                </>
              )}
              <button className="rounded p-1 text-ink-3 hover:bg-bad-soft hover:text-bad" onClick={onRemove} aria-label="Remover widget"><X className="size-3.5" /></button>
            </div>
          </div>
        )}
        <div className={cn(editing && "pointer-events-auto")}>
          <WidgetContent widget={widget} ctx={ctx} onConfig={editing || widget.type === "revenue_chart" || widget.type === "expense_chart" ? onConfig : undefined} />
        </div>
      </Card>
    </div>
  );
}

export function Dashboard({
  layouts, data, currency, locale, timezone, permissions, canEdit,
}: { layouts: DashboardLayout[]; data: DashboardData; currency: string; locale: string; timezone: string; permissions: PermissionMap; canEdit: boolean }) {
  const router = useRouter();
  const active = layouts.find((l) => l.is_active) ?? layouts[0]!;
  const [editing, setEditing] = useState(false);
  const [widgets, setWidgets] = useState<WidgetInstance[]>(active.widgets);
  const [density, setDensity] = useState(active.density);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [saveAsName, setSaveAsName] = useState("");
  const [pending, start] = useTransition();

  // Sync when the server sends a different active layout.
  const [syncedId, setSyncedId] = useState(active.id + active.widgets.length + active.density);
  const key = active.id + active.widgets.length + active.density;
  if (!editing && key !== syncedId) { setSyncedId(key); setWidgets(active.widgets); setDensity(active.density); }

  const visible = useMemo(() => widgets.filter((w) => {
    const def = widgetDef(w.type);
    return def && permissions[def.section].view;
  }), [widgets, permissions]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ctx: Ctx = { data, currency, locale, timezone, compact: density === "compact" };
  const dirty = JSON.stringify(widgets) !== JSON.stringify(active.widgets) || density !== active.density;

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    setWidgets((ws) => arrayMove(ws, ws.findIndex((w) => w.id === e.active.id), ws.findIndex((w) => w.id === e.over!.id)));
  }
  const update = (id: string, patch: Partial<WidgetInstance>) => setWidgets((ws) => ws.map((w) => (w.id === id ? { ...w, ...patch } : w)));

  function persistConfig(id: string, config: WidgetInstance["config"]) {
    const next = widgets.map((w) => (w.id === id ? { ...w, config } : w));
    setWidgets(next);
    if (!editing && canEdit) start(async () => { await saveLayoutAction(active.id, { widgets: next, density }); });
  }

  function save() {
    start(async () => {
      const res = await saveLayoutAction(active.id, { widgets, density });
      if (!res.ok) return void toast.error(res.error);
      toast.success("Painel salvo");
      setEditing(false);
      router.refresh();
    });
  }
  function cancel() { setWidgets(active.widgets); setDensity(active.density); setEditing(false); }

  const present = new Set(widgets.map((w) => w.type));
  const library = WIDGETS.filter((w) => permissions[w.section].view);
  const groups = [...new Set(library.map((w) => w.group))];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        {editing ? (
          <div className="flex w-full flex-wrap items-center gap-2 rounded-lg bg-surface p-2 shadow-card animate-slide-up">
            <span className="flex items-center gap-2 px-2 text-sm font-medium"><LayoutGrid className="size-4 text-brand" /> Personalizando “{active.name}” — arraste, aumente ou remova</span>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Segmented ariaLabel="Espaçamento" value={density} onChange={setDensity} options={[{ value: "comfortable", label: "Confortável" }, { value: "compact", label: "Compacto" }]} />
              <Button size="sm" onClick={() => setLibraryOpen(true)}><Plus /> Adicionar widget</Button>
              <Dropdown>
                <DropdownTrigger asChild><Button size="sm" variant="ghost"><RotateCcw /> Modelos <ChevronDown /></Button></DropdownTrigger>
                <DropdownContent>
                  <DropdownLabel>Trocar por um modelo pronto</DropdownLabel>
                  {(Object.keys(DASHBOARD_PRESETS) as PresetKey[]).map((k) => (
                    <DropdownItem key={k} onSelect={() => setWidgets(DASHBOARD_PRESETS[k].widgets.map((w) => ({ ...w })))}>{DASHBOARD_PRESETS[k].name}{k === "owner" ? " (padrão)" : ""}</DropdownItem>
                  ))}
                </DropdownContent>
              </Dropdown>
              <Button size="sm" variant="ghost" onClick={cancel} disabled={pending}>Cancelar</Button>
              <Button size="sm" variant="outline" onClick={() => { setSaveAsName(""); setSaveAsOpen(true); }} disabled={pending}>Salvar como novo</Button>
              <Button size="sm" variant="primary" onClick={save} loading={pending} disabled={!dirty}><Save /> Salvar</Button>
            </div>
          </div>
        ) : (
          <>
            {layouts.length > 1 && (
              <Dropdown>
                <DropdownTrigger asChild><Button variant="ghost">{active.name} <ChevronDown className="text-ink-3" /></Button></DropdownTrigger>
                <DropdownContent>
                  <DropdownLabel>Layouts salvos</DropdownLabel>
                  {layouts.map((l) => (
                    <DropdownItem key={l.id} onSelect={() => start(async () => { const r = await activateLayoutAction(l.id); if (!r.ok) toast.error(r.error); router.refresh(); })}>
                      <span className="flex-1">{l.name}</span>{l.is_active && <Check className="!text-brand" />}
                    </DropdownItem>
                  ))}
                  {canEdit && (<>
                    <DropdownSeparator />
                    <DropdownItem destructive onSelect={() => start(async () => { const r = await deleteLayoutAction(active.id); if (!r.ok) toast.error(r.error); else toast.success("Layout excluído"); router.refresh(); })}><Trash2 /> Excluir “{active.name}”</DropdownItem>
                  </>)}
                </DropdownContent>
              </Dropdown>
            )}
            {canEdit && <Button onClick={() => setEditing(true)}><SlidersHorizontal /> Personalizar painel</Button>}
          </>
        )}
      </div>

      {visible.length ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={visible.map((w) => w.id)} strategy={rectSortingStrategy}>
            <div className={cn("grid grid-flow-row-dense grid-cols-1 md:grid-cols-2 xl:grid-cols-4", density === "compact" ? "gap-3" : "gap-4")}>
              {visible.map((w) => (
                <SortableWidget
                  key={w.id}
                  widget={w}
                  ctx={ctx}
                  editing={editing}
                  onRemove={() => setWidgets((ws) => ws.filter((x) => x.id !== w.id))}
                  onResize={(dir) => {
                    const sizes = widgetDef(w.type)?.sizes ?? [w.size];
                    const next = sizes[Math.min(Math.max(sizes.indexOf(w.size) + dir, 0), sizes.length - 1)]!;
                    update(w.id, { size: next });
                  }}
                  onConfig={(c) => (editing ? update(w.id, { config: c }) : persistConfig(w.id, c))}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <Card className="p-10 text-center">
          <p className="text-sm font-semibold">Seu painel está vazio</p>
          <p className="mt-1 text-sm text-ink-3">Adicione widgets da biblioteca para montar o seu painel.</p>
          {canEdit && <Button className="mt-4" variant="primary" onClick={() => { setEditing(true); setLibraryOpen(true); }}><Plus /> Adicionar widgets</Button>}
        </Card>
      )}

      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent title="Biblioteca de widgets" description="Escolha o que quer ver no painel. Você vê a prévia antes de salvar." size="lg">
          <div className="flex flex-col gap-6">
            {groups.map((g) => (
              <div key={g}>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-3">{g}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {library.filter((w) => w.group === g).map((w) => {
                    const added = present.has(w.type);
                    return (
                      <button key={w.type} type="button" disabled={added}
                        onClick={() => { setWidgets((ws) => [...ws, { id: newWidgetId(w.type), type: w.type, size: w.defaultSize }]); toast.success(`${w.title} adicionado`, { duration: 1500 }); }}
                        className="flex items-start gap-3 rounded-lg p-3 text-left ring-1 ring-line transition hover:bg-surface-2 hover:ring-line-strong disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent">
                        <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{w.title}</span><span className="block text-xs text-ink-3">{w.description}</span></span>
                        {added ? <Check className="size-4 shrink-0 text-good" aria-label="Já adicionado" /> : <Plus className="size-4 shrink-0 text-ink-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={saveAsOpen} onOpenChange={setSaveAsOpen}>
        <DialogContent title="Salvar como novo layout" description="Guarde esta arrumação para alternar quando quiser." size="sm"
          footer={<>
            <Button variant="ghost" onClick={() => setSaveAsOpen(false)}>Cancelar</Button>
            <Button variant="primary" loading={pending} disabled={!saveAsName.trim()} onClick={() => start(async () => {
              const r = await createLayoutAction(saveAsName, { widgets, density });
              if (!r.ok) return void toast.error(r.error);
              toast.success("Layout salvo");
              setSaveAsOpen(false);
              setEditing(false);
              router.refresh();
            })}>Salvar layout</Button>
          </>}>
          <Input autoFocus placeholder="ex.: Movimento de sexta à noite" value={saveAsName} onChange={(e) => setSaveAsName(e.target.value)} maxLength={60} aria-label="Nome do layout" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
