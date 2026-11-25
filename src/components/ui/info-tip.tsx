"use client";

import * as T from "@radix-ui/react-tooltip";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/** Small "what does this mean?" hint, keyboard- and touch-accessible. */
export function InfoTip({ text, className }: { text: string; className?: string }) {
  return (
    <T.Root delayDuration={150}>
      <T.Trigger asChild>
        <button type="button" className={cn("inline-flex size-4 items-center justify-center rounded-full text-ink-3 transition hover:text-ink focus-visible:text-ink", className)} aria-label={text}>
          <Info className="size-3.5" />
        </button>
      </T.Trigger>
      <T.Portal>
        <T.Content side="top" sideOffset={6} className="z-[60] max-w-64 rounded-md bg-surface-3 px-3 py-2 text-xs leading-relaxed text-ink shadow-pop data-[state=delayed-open]:animate-fade-in">
          {text}
          <T.Arrow className="fill-[var(--surface-3)]" />
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}

export const TooltipProvider = T.Provider;
