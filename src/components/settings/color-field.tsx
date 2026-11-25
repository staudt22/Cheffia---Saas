"use client";

import { Input } from "@/components/ui/input";
import { contrastRatio, isValidHex } from "@/lib/theme";

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const lowContrast = isValidHex(value) && contrastRatio(value, "#111614") < 2.2;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-ink-2">{label}</span>
      <div className="flex items-center gap-2">
        <label className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-md shadow-card" style={{ background: isValidHex(value) ? value : "#ccc" }}>
          <input type="color" value={isValidHex(value) ? value : "#34d399"} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={label} />
        </label>
        <Input value={value} onChange={(e) => onChange(e.target.value)} maxLength={7} className="w-28 font-mono uppercase" aria-invalid={!isValidHex(value)} />
      </div>
      {lowContrast && <p className="text-xs text-ink-3">Cores muito escuras são clareadas automaticamente para o texto continuar legível.</p>}
    </div>
  );
}
