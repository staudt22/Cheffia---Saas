import { cn } from "@/lib/utils";

/** Forkly mark: a fork whose tines double as a rising bar chart. */
export function ForklyMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <g fill="#fff">
        <rect x="9" y="12" width="3" height="8" rx="1.5" />
        <rect x="14.5" y="9" width="3" height="11" rx="1.5" />
        <rect x="20" y="6" width="3" height="14" rx="1.5" />
        <path d="M9 18.5h14v1.2a5 5 0 0 1-5 5h-0.5v2.8a1.5 1.5 0 0 1-3 0v-2.8H14a5 5 0 0 1-5-5z" />
      </g>
    </svg>
  );
}

export function ForklyLogo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-ink", className)}>
      <ForklyMark className={cn("text-[#3f6b4e]", markClassName)} />
      <span className="font-display text-[19px] font-semibold tracking-tight">Forkly</span>
    </span>
  );
}
