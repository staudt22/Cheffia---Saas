"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AlertTriangle, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { saveRecipeAction } from "@/app/(app)/menu/actions";
import { compatibleUnits, convertQuantity, defaultRecipeUnit } from "@/lib/units";
import { cn, formatMoney, formatPercent } from "@/lib/utils";
import type { InventoryItem, InventoryUnit, MenuItem } from "@/lib/types";

interface Line { inventory_item_id: string; quantity: string; unit: InventoryUnit }

export function RecipeBuilder({ item, recipe, inventory, autoDeduct, currency, locale, canEdit, canSeeInventory }: {
  item: MenuItem;
  recipe: { prep_minutes: number | null; instructions: string | null; deduct_on_completion: boolean; ingredients: { inventory_item_id: string; quantity: number; unit: InventoryUnit }[] } | null;
  inventory: InventoryItem[]; autoDeduct: boolean; currency: string; locale: string; canEdit: boolean; canSeeInventory: boolean;
}) {
  const [lines, setLines] = useState<Line[]>(recipe?.ingredients.map((i) => ({ ...i, quantity: String(i.quantity) })) ?? []);
  const [prep, setPrep] = useState(recipe?.prep_minutes != null ? String(recipe.prep_minutes) : "");
  const [instructions, setInstructions] = useState(recipe?.instructions ?? "");
  const [deduct, setDeduct] = useState(recipe?.deduct_on_completion ?? true);
  const [pending, start] = useTransition();
  const money = (v: number) => formatMoney(v, currency, locale);
  const byId = new Map(inventory.map((i) => [i.id, i]));

  const costed = lines.map((l) => {
    const inv = byId.get(l.inventory_item_id);
    const qty = Number(l.quantity);
    const converted = inv && qty > 0 ? convertQuantity(qty, l.unit, inv.unit) : null;
    return { ...l, inv, cost: converted != null && inv ? converted * Number(inv.unit_cost) : 0, mismatch: inv && converted == null };
  });
  const total = costed.reduce((s, l) => s + l.cost, 0);
  const profit = item.price - total;
  const margin = item.price > 0 ? profit / item.price : null;
  const unused = inventory.filter((i) => !lines.some((l) => l.inventory_item_id === i.id));

  function save() {
    start(async () => {
      const r = await saveRecipeAction(item.id, {
        prep_minutes: prep === "" ? null : Number(prep),
        instructions,
        deduct_on_completion: deduct,
        ingredients: lines.filter((l) => l.inventory_item_id && Number(l.quantity) > 0).map((l) => ({ ...l, quantity: Number(l.quantity) })),
      });
      if (!r.ok) return void toast.error(r.error);
      toast.success("Recipe saved");
    });
  }

  return (
    <div>
      <Link href="/menu" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ArrowLeft className="size-4" /> Menu</Link>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">{item.name}</h1>
          <p className="mt-1 text-sm text-ink-3">Recipe builder · sells for {money(item.price)}</p>
        </div>
        {canEdit && <Button variant="primary" loading={pending} onClick={save}>Save recipe</Button>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader title="Ingredients" description="Quantities per portion. Costs use the current price of each inventory item." />
          <div className="p-4">
            {!canSeeInventory ? (
              <p className="text-sm text-ink-3">Your role can&apos;t view inventory, so ingredients can&apos;t be edited here.</p>
            ) : !inventory.length ? (
              <EmptyState className="py-6" title="No inventory items yet" description="Recipes are built from your inventory so costs and stock stay in sync." action={<Button asChild variant="primary"><Link href="/inventory?new=1">Add inventory</Link></Button>} />
            ) : (
              <>
                {costed.length > 0 && (
                  <div className="mb-2 hidden grid-cols-[1fr_100px_90px_90px_36px] gap-2 px-1 text-xs font-medium text-ink-3 sm:grid"><span>Ingredient</span><span>Quantity</span><span>Unit</span><span className="text-right">Cost</span></div>
                )}
                <ul className="flex flex-col gap-2">
                  {costed.map((l, idx) => (
                    <li key={idx} className="grid grid-cols-[1fr_90px_80px_36px] items-center gap-2 sm:grid-cols-[1fr_100px_90px_90px_36px]">
                      <Select value={l.inventory_item_id} disabled={!canEdit} aria-label="Ingredient" onChange={(e) => {
                        const inv = byId.get(e.target.value);
                        setLines(lines.map((x, j) => (j === idx ? { ...x, inventory_item_id: e.target.value, unit: inv ? defaultRecipeUnit(inv.unit) : x.unit } : x)));
                      }}>
                        {[l.inv, ...unused].filter(Boolean).map((i) => <option key={i!.id} value={i!.id}>{i!.name}</option>)}
                      </Select>
                      <Input type="number" min={0} step="any" value={l.quantity} disabled={!canEdit} aria-label="Quantity" onChange={(e) => setLines(lines.map((x, j) => (j === idx ? { ...x, quantity: e.target.value } : x)))} />
                      <Select value={l.unit} disabled={!canEdit} aria-label="Unit" onChange={(e) => setLines(lines.map((x, j) => (j === idx ? { ...x, unit: e.target.value as InventoryUnit } : x)))}>
                        {(l.inv ? compatibleUnits(l.inv.unit) : [l.unit]).map((u) => <option key={u} value={u}>{u}</option>)}
                      </Select>
                      <span className={cn("hidden text-right text-sm tabular sm:block", l.mismatch && "text-bad")}>{l.mismatch ? <AlertTriangle className="ml-auto size-4" aria-label="Unit mismatch" /> : money(l.cost)}</span>
                      {canEdit && <Button variant="ghost" size="icon" aria-label="Remove ingredient" onClick={() => setLines(lines.filter((_, j) => j !== idx))}><Trash2 /></Button>}
                    </li>
                  ))}
                </ul>
                {canEdit && unused.length > 0 && (
                  <Button variant="ghost" className="mt-2" onClick={() => setLines([...lines, { inventory_item_id: unused[0]!.id, quantity: "", unit: defaultRecipeUnit(unused[0]!.unit) }])}><Plus /> Add ingredient</Button>
                )}
                {!lines.length && <p className="py-4 text-sm text-ink-3">No ingredients yet. Add them to see food cost and margin.</p>}
              </>
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-3">Cost per portion</p>
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><dt className="text-ink-2">Estimated food cost</dt><dd className="font-medium tabular">{money(total)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-2">Selling price</dt><dd className="tabular">{money(item.price)}</dd></div>
              <div className="flex justify-between border-t border-line pt-2"><dt className="text-ink-2">Gross profit</dt><dd className={cn("font-semibold tabular", profit < 0 && "text-bad")}>{money(profit)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-2">Margin</dt><dd className={cn("font-semibold tabular", margin != null && margin < 0.6 ? "text-warn" : "text-good")}>{formatPercent(margin, locale, 1)}</dd></div>
              <div className="flex justify-between text-xs text-ink-3"><dt>Food cost %</dt><dd className="tabular">{item.price > 0 ? formatPercent(total / item.price, locale, 1) : "—"}</dd></div>
            </dl>
            {margin != null && margin < 0.6 && lines.length > 0 && <p className="mt-3 rounded-md bg-warn-soft px-2.5 py-2 text-xs text-warn">Food cost is above 40% of the price. Most restaurants aim for 28–35%.</p>}
          </Card>
          <Card className="flex flex-col gap-4 p-4">
            <Field label="Preparation time (minutes)" htmlFor="prep" hint="Used as the estimated time on the kitchen display.">
              <Input id="prep" type="number" min={0} max={600} value={prep} disabled={!canEdit} onChange={(e) => setPrep(e.target.value)} />
            </Field>
            <label className="flex items-start justify-between gap-3">
              <span><span className="block text-sm font-medium">Deduct stock on completion</span>
                <span className="block text-xs text-ink-3">{autoDeduct ? "Ingredients are removed from inventory when an order with this item is completed." : "Automatic deduction is turned off in Settings."}</span></span>
              <Switch checked={deduct} disabled={!canEdit} onCheckedChange={setDeduct} />
            </label>
            <Field label="Instructions" htmlFor="instr"><Textarea id="instr" rows={4} value={instructions} disabled={!canEdit} onChange={(e) => setInstructions(e.target.value)} placeholder="Steps, plating notes…" /></Field>
          </Card>
        </div>
      </div>
    </div>
  );
}
