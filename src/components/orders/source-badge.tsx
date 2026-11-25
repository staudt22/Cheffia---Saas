import { FlaskConical } from "lucide-react";
import { SOURCE_META } from "@/lib/orders";
import type { OrderSource } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SourceBadge({ source, simulated, className }: { source: OrderSource; simulated?: boolean; className?: string }) {
  const m = SOURCE_META[source];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-ink-2", className)}>
      <span className="size-2 rounded-full" style={{ background: m.color }} aria-hidden />
      {m.label}
      {simulated && (
        <span className="inline-flex items-center gap-0.5 rounded bg-accent-soft px-1 py-px text-[10px] font-medium text-accent" title="Simulated order — not from a real connected platform">
          <FlaskConical className="size-2.5" /> Simulated
        </span>
      )}
    </span>
  );
}
