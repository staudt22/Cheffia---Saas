import { cn, initials } from "@/lib/utils";

export function RestaurantAvatar({ name, logoUrl, className }: { name: string; logoUrl: string | null; className?: string }) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt="" className={cn("size-7 shrink-0 rounded-md bg-surface object-contain", className)} />;
  }
  return (
    <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md bg-brand text-[11px] font-semibold text-brand-foreground", className)}>
      {initials(name) || "R"}
    </span>
  );
}
