"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

/** Uploads an image to the restaurant's folder in the public "branding" bucket. */
export function ImageUpload({
  restaurantId, value, onChange, kind = "logo", className,
}: { restaurantId: string; value: string | null; onChange: (url: string | null) => void; kind?: "logo" | "cover"; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (!TYPES.includes(file.type)) return toast.error("Use uma imagem PNG, JPG, WebP ou SVG.");
    if (file.size > MAX_BYTES) return toast.error("A imagem precisa ter até 5 MB.");
    setBusy(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `${restaurantId}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: false, contentType: file.type });
    setBusy(false);
    if (error) return toast.error("Não foi possível enviar. Tente novamente.");
    onChange(supabase.storage.from("branding").getPublicUrl(path).data.publicUrl);
  }

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={cn(
          "group relative flex shrink-0 items-center justify-center overflow-hidden border border-dashed border-line-strong bg-surface-2 text-ink-3 transition-colors hover:border-brand hover:text-brand",
          kind === "logo" ? "size-20 rounded-xl" : "h-20 w-36 rounded-lg",
        )}
        aria-label={kind === "logo" ? "Enviar logo" : "Enviar capa"}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className={cn("size-full", kind === "logo" ? "object-contain p-2" : "object-cover")} />
        ) : (
          <ImagePlus className="size-6" />
        )}
        {busy && <span className="absolute inset-0 animate-pulse-soft bg-surface/70" />}
      </button>
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={() => input.current?.click()} loading={busy}>{value ? "Trocar" : "Enviar"}</Button>
          {value && <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}><Trash2 /> Remover</Button>}
        </div>
        <p className="text-xs text-ink-3">PNG, JPG, WebP ou SVG · até 5 MB{kind === "logo" ? " · quadrado fica melhor" : ""}</p>
      </div>
      <input ref={input} type="file" accept={TYPES.join(",")} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
    </div>
  );
}
