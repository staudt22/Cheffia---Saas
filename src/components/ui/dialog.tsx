"use client";
import * as React from "react";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  title, description, children, className, footer, size = "md",
}: { title: string; description?: string; children: React.ReactNode; className?: string; footer?: React.ReactNode; size?: "sm" | "md" | "lg" }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
      <D.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl bg-surface shadow-pop data-[state=open]:animate-slide-up",
          size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-3xl" : "max-w-lg",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <D.Title className="text-base font-semibold text-ink">{title}</D.Title>
            {description ? <D.Description className="mt-0.5 text-sm text-ink-3">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
          </div>
          <D.Close className="rounded-md p-1 text-ink-3 hover:bg-surface-3 hover:text-ink" aria-label="Close"><X className="size-4" /></D.Close>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </D.Content>
    </D.Portal>
  );
}

/** Right-hand side panel built on the same accessible primitive. */
export function SheetContent({ title, description, children, footer, className }: { title: React.ReactNode; description?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; className?: string }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/55 data-[state=open]:animate-fade-in" />
      <D.Content className={cn("fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-surface shadow-pop data-[state=open]:animate-slide-in-right", className)}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <D.Title className="text-base font-semibold text-ink">{title}</D.Title>
            {description ? <D.Description className="mt-0.5 text-sm text-ink-3">{description}</D.Description> : <D.Description className="sr-only">Details</D.Description>}
          </div>
          <D.Close className="rounded-md p-1 text-ink-3 hover:bg-surface-3 hover:text-ink" aria-label="Close"><X className="size-4" /></D.Close>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </D.Content>
    </D.Portal>
  );
}
