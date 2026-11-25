import Image from "next/image";
import { cn } from "@/lib/utils";

/** Desktop browser chrome around a real product screenshot. */
export function BrowserFrame({ src, alt, className, priority }: { src: string; alt: string; className?: string; priority?: boolean }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl bg-surface shadow-pop ring-1 ring-white/10", className)}>
      <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" /><span className="size-2.5 rounded-full bg-[#febc2e]" /><span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 hidden flex-1 truncate rounded-md bg-surface-3 px-3 py-1 text-center text-[11px] text-ink-3 sm:block">cheffedata · {alt}</span>
      </div>
      <Image src={src} alt={alt} width={1600} height={1000} priority={priority} sizes="(max-width: 1024px) 100vw, 1100px" className="block h-auto w-full" />
    </div>
  );
}

/** Phone mockup around a mobile screenshot. */
export function PhoneFrame({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={cn("rounded-[2.2rem] bg-[#0b0f0d] p-2 shadow-pop ring-1 ring-white/15", className)}>
      <div className="relative overflow-hidden rounded-[1.8rem]">
        <span className="absolute left-1/2 top-2 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-black/80" aria-hidden />
        <Image src={src} alt={alt} width={780} height={1688} sizes="260px" className="block h-auto w-full" />
      </div>
    </div>
  );
}
