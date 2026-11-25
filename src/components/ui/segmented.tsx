"use client";
import { cn } from "@/lib/utils";

export function Segmented<T extends string>({
  value, onChange, options, size = "sm", className, ariaLabel,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; size?: "sm" | "md"; className?: string; ariaLabel?: string }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("inline-flex rounded-md bg-surface-3 p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-[5px] font-medium text-ink-3 transition-all",
            size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
            value === o.value ? "bg-surface text-ink shadow-sm" : "hover:text-ink-2",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
