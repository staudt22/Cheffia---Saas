"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ChefHat, ImageIcon, MoreHorizontal, Pencil, Plus, Search, Tags, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { MenuItemDialog } from "@/components/menu/menu-item-dialog";
import { deleteCategoryAction, deleteMenuItemAction, saveCategoryAction, setAvailabilityAction } from "@/app/(app)/menu/actions";
import { cn, formatMoney, formatPercent } from "@/lib/utils";
import type { MenuCategory, MenuItem } from "@/lib/types";

export function MenuView({ items, categories, costs, restaurantId, currency, locale, canEdit }: {
  items: MenuItem[]; categories: MenuCategory[]; costs: Record<string, { foodCost: number; ingredients: number }>;
  restaurantId: string; currency: string; locale: string; canEdit: boolean;
}) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<MenuItem | "new" | null>(null);
  const [catDialog, setCatDialog] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<MenuItem | null>(null);
  const [pending, start] = useTransition();
  const money = (v: number) => formatMoney(v, currency, locale);

  const filtered = useMemo(() => items.filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase())), [items, q]);
  const groups = [...categories.map((c) => ({ id: c.id, name: c.name })), { id: null as string | null, name: "Uncategorized" }]
    .map((g) => ({ ...g, items: filtered.filter((i) => i.category_id === g.id) }))
    .filter((g) => g.items.length || (g.id && !q));

  return (
    <div>
      <PageHeader title="Menu" description="Products, prices and recipes. Food cost is estimated from your inventory prices."
        actions={canEdit && <>
          <Button onClick={() => setCatDialog(true)}><Tags /> Categories</Button>
          <Button variant="primary" onClick={() => setEditing("new")}><Plus /> Add item</Button>
        </>} />
      {items.length > 0 && (
        <div className="relative mb-4 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the menu" className="pl-9" aria-label="Search menu" />
        </div>
      )}
      {!items.length ? (
        <Card><EmptyState icon={<UtensilsCrossed />} title="Your menu is empty" description="Add the dishes and drinks you sell. Then build recipes so Forkly can calculate food cost and deduct stock."
          action={canEdit && <Button variant="primary" onClick={() => setEditing("new")}><Plus /> Add your first item</Button>} /></Card>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <section key={g.id ?? "none"}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-2">{g.name}<span className="text-xs font-normal text-ink-3">{g.items.length}</span></h2>
              {g.items.length ? (
                <Card className="divide-y divide-line">
                  {g.items.map((item) => {
                    const c = costs[item.id];
                    const hasRecipe = c && c.ingredients > 0;
                    const margin = hasRecipe && item.price > 0 ? 1 - c.foodCost / item.price : null;
                    return (
                      <div key={item.id} className={cn("flex items-center gap-3 px-4 py-3", !item.is_available && "opacity-60")}>
                        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-3 text-ink-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {item.photo_url ? <img src={item.photo_url} alt="" className="size-full object-cover" /> : <ImageIcon className="size-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          <p className="truncate text-xs text-ink-3">{item.description ?? "No description"}</p>
                        </div>
                        <div className="hidden w-28 text-right sm:block">
                          {hasRecipe ? <><p className="text-xs text-ink-3">Food cost</p><p className="text-sm tabular">{money(c.foodCost)}</p></> : <Badge tone="outline">No recipe</Badge>}
                        </div>
                        <div className="hidden w-20 text-right sm:block">
                          {margin != null && <><p className="text-xs text-ink-3">Margin</p><p className={cn("text-sm font-medium tabular", margin < 0.6 ? "text-warn" : "text-good")}>{formatPercent(margin, locale, 0)}</p></>}
                        </div>
                        <p className="w-20 text-right text-sm font-semibold tabular">{money(item.price)}</p>
                        {canEdit && (
                          <>
                            <Switch checked={item.is_available} aria-label={`${item.name} available`} disabled={pending}
                              onCheckedChange={(v) => start(async () => { const r = await setAvailabilityAction(item.id, v); if (!r.ok) toast.error(r.error); })} />
                            <Dropdown>
                              <DropdownTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="More actions"><MoreHorizontal /></Button></DropdownTrigger>
                              <DropdownContent>
                                <DropdownItem onSelect={() => setEditing(item)}><Pencil /> Edit details</DropdownItem>
                                <DropdownItem asChild><Link href={`/menu/${item.id}`}><ChefHat /> {hasRecipe ? "Edit recipe" : "Build recipe"}</Link></DropdownItem>
                                <DropdownSeparator />
                                <DropdownItem destructive onSelect={() => setConfirmDelete(item)}><Trash2 /> Delete</DropdownItem>
                              </DropdownContent>
                            </Dropdown>
                          </>
                        )}
                      </div>
                    );
                  })}
                </Card>
              ) : <p className="rounded-lg border border-dashed border-line-strong px-4 py-3 text-sm text-ink-3">No items in this category yet.</p>}
            </section>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && <MenuItemDialog item={editing === "new" ? null : editing} categories={categories} restaurantId={restaurantId} currency={currency} onDone={() => setEditing(null)} />}
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent size="sm" title={`Delete ${confirmDelete?.name}?`} description="Past orders keep their history. To hide it temporarily, turn availability off instead."
          footer={<><Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button><Button variant="danger" loading={pending} onClick={() => start(async () => {
            const r = await deleteMenuItemAction(confirmDelete!.id);
            if (!r.ok) return void toast.error(r.error);
            toast.success("Item deleted"); setConfirmDelete(null);
          })}>Delete</Button></>}><span /></DialogContent>
      </Dialog>

      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        {catDialog && <CategoryManager categories={categories} />}
      </Dialog>
    </div>
  );
}

function CategoryManager({ categories }: { categories: MenuCategory[] }) {
  const [name, setName] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok?: () => void) => start(async () => { const r = await fn(); if (!r.ok) toast.error(r.error); else ok?.(); });
  return (
    <DialogContent title="Menu categories" description="Group your menu the way guests read it." size="sm">
      <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); run(() => saveCategoryAction(null, name), () => setName("")); }}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category, e.g. Brunch" aria-label="New category name" />
        <Button type="submit" variant="primary" disabled={!name.trim()} loading={pending}>Add</Button>
      </form>
      <ul className="flex flex-col gap-1.5">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            <Input value={edits[c.id] ?? c.name} onChange={(e) => setEdits({ ...edits, [c.id]: e.target.value })} aria-label={`Rename ${c.name}`}
              onBlur={() => { const v = edits[c.id]; if (v != null && v.trim() && v !== c.name) run(() => saveCategoryAction(c.id, v)); }} />
            <Button variant="ghost" size="icon" aria-label={`Delete ${c.name}`} onClick={() => run(() => deleteCategoryAction(c.id))}><Trash2 /></Button>
          </li>
        ))}
        {!categories.length && <p className="text-sm text-ink-3">No categories yet.</p>}
      </ul>
      <p className="mt-3 text-xs text-ink-3">Deleting a category moves its items to “Uncategorized”.</p>
    </DialogContent>
  );
}
