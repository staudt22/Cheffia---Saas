"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { saveMenuItemAction } from "@/app/(app)/menu/actions";
import type { MenuCategory, MenuItem } from "@/lib/types";

export function MenuItemDialog({ item, categories, restaurantId, currency, onDone }: { item: MenuItem | null; categories: MenuCategory[]; restaurantId: string; currency: string; onDone: () => void }) {
  const router = useRouter();
  const [v, setV] = useState({
    name: item?.name ?? "", description: item?.description ?? "", price: item ? String(item.price) : "",
    category_id: item?.category_id ?? categories[0]?.id ?? "", is_available: item?.is_available ?? true, photo_url: item?.photo_url ?? null as string | null,
  });
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const file = useRef<HTMLInputElement>(null);

  async function upload(f: File) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(f.type) || f.size > 5 * 1024 * 1024) return toast.error("Use uma imagem PNG, JPG ou WebP de até 5 MB.");
    setUploading(true);
    const supabase = createClient();
    const path = `${restaurantId}/${crypto.randomUUID()}.${f.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("menu-photos").upload(path, f, { contentType: f.type });
    setUploading(false);
    if (error) return toast.error("Não foi possível enviar a foto");
    setV((s) => ({ ...s, photo_url: supabase.storage.from("menu-photos").getPublicUrl(path).data.publicUrl }));
  }

  function save(thenRecipe = false) {
    start(async () => {
      const r = await saveMenuItemAction(item?.id ?? null, { ...v, category_id: v.category_id || null, price: v.price });
      if (!r.ok) return void toast.error(r.error);
      toast.success(item ? "Item atualizado" : "Item adicionado");
      onDone();
      if (thenRecipe && r.data) router.push(`/menu/${r.data.id}`);
    });
  }

  return (
    <DialogContent title={item ? `Editar ${item.name}` : "Novo item do cardápio"}
      footer={<>
        <Button variant="ghost" onClick={onDone}>Cancelar</Button>
        {!item && <Button variant="outline" loading={pending} disabled={!v.name.trim() || v.price === ""} onClick={() => save(true)}>Salvar e montar ficha técnica</Button>}
        <Button variant="primary" loading={pending} disabled={!v.name.trim() || v.price === ""} onClick={() => save()}>Salvar</Button>
      </>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[96px_1fr]">
        <button type="button" onClick={() => file.current?.click()} className="relative flex size-24 items-center justify-center overflow-hidden rounded-lg border border-dashed border-line-strong bg-surface-2 text-ink-3 hover:border-brand hover:text-brand" aria-label="Enviar foto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {v.photo_url ? <img src={v.photo_url} alt="" className="size-full object-cover" /> : <ImagePlus className="size-6" />}
          {uploading && <span className="absolute inset-0 animate-pulse-soft bg-surface/70" />}
        </button>
        <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        <div className="flex flex-col gap-3">
          <Field label="Nome" htmlFor="mi-name"><Input id="mi-name" autoFocus value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Preço (${currency === "BRL" ? "R$" : currency})`} htmlFor="mi-price"><Input id="mi-price" type="number" min={0} step="0.01" value={v.price} onChange={(e) => setV({ ...v, price: e.target.value })} /></Field>
            <Field label="Categoria" htmlFor="mi-cat">
              <Select id="mi-cat" value={v.category_id} onChange={(e) => setV({ ...v, category_id: e.target.value })}>
                <option value="">Sem categoria</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          </div>
        </div>
        <Field label="Descrição" htmlFor="mi-desc" className="sm:col-span-2"><Textarea id="mi-desc" rows={2} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} placeholder="O que o cliente lê no cardápio" /></Field>
        <label className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2.5 sm:col-span-2">
          <span><span className="block text-sm font-medium">Disponível</span><span className="block text-xs text-ink-3">Itens indisponíveis não podem ser adicionados a novos pedidos.</span></span>
          <Switch checked={v.is_available} onCheckedChange={(c) => setV({ ...v, is_available: c })} />
        </label>
      </div>
    </DialogContent>
  );
}
