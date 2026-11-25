"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import * as Popover from "@radix-ui/react-popover";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
import { RANGE_PRESETS, type DateRange } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function DateRangePicker({ range }: { range: DateRange }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [pending, start] = useTransition();

  function apply(key: string, f?: string, t?: string) {
    const next = new URLSearchParams(params);
    next.set("range", key);
    if (key === "custom" && f && t) { next.set("from", f); next.set("to", t); } else { next.delete("from"); next.delete("to"); }
    setOpen(false);
    start(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button variant="secondary" className={cn(pending && "opacity-70")}>
          <CalendarDays className="text-ink-3" /> {range.label} <ChevronDown className="text-ink-3" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} className="z-50 w-72 rounded-lg bg-surface p-1 shadow-pop data-[state=open]:animate-fade-in">
          {RANGE_PRESETS.map((p) => (
            <button key={p.key} onClick={() => apply(p.key)} className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-surface-3">
              {p.label} {range.key === p.key && <Check className="size-4 text-brand" />}
            </button>
          ))}
          <div className="mt-1 border-t border-line p-2">
            <p className="mb-2 text-xs font-medium text-ink-3">Escolher datas</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1"><Label htmlFor="dr-from" className="text-xs">De</Label><Input id="dr-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-8 px-2 text-xs" /></div>
              <div className="flex flex-col gap-1"><Label htmlFor="dr-to" className="text-xs">Até</Label><Input id="dr-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="h-8 px-2 text-xs" /></div>
            </div>
            <Button size="sm" variant="primary" className="mt-2 w-full" disabled={!from || !to || from > to} onClick={() => apply("custom", from, to)}>Aplicar</Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
