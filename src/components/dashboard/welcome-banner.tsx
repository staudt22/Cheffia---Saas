"use client";

import Link from "next/link";
import { useState } from "react";
import { PartyPopper, X } from "lucide-react";

export function WelcomeBanner({ isDemo }: { isDemo: boolean }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg bg-surface p-4 shadow-card animate-slide-up">
      <PartyPopper className="mt-0.5 size-5 shrink-0 text-accent" />
      <div className="flex-1 text-sm">
        <p className="font-semibold">{isDemo ? "Your demo restaurant is ready" : "Your workspace is ready"}</p>
        <p className="mt-0.5 text-ink-3">
          {isDemo ? "Explore six weeks of sample data. Try the kitchen display, complete an order, or customize this dashboard." : <>Next: <Link className="text-brand hover:underline" href="/orders?new=1">create your first order</Link>, <Link className="text-brand hover:underline" href="/finances">record an expense</Link> or <Link className="text-brand hover:underline" href="/menu">add recipes</Link> so Forkly can track food cost.</>}
        </p>
      </div>
      <button onClick={() => setOpen(false)} className="rounded p-1 text-ink-3 hover:bg-surface-3" aria-label="Dismiss"><X className="size-4" /></button>
    </div>
  );
}
