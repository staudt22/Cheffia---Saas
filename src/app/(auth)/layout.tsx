import Link from "next/link";
import { ForklyLogo } from "@/components/app/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-6 py-6 sm:px-12">
        <Link href="/" className="w-fit"><ForklyLogo /></Link>
        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-sm py-10">{children}</div>
        </div>
      </div>
      <aside className="relative hidden overflow-hidden bg-[#2b3a30] lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_55%)]" />
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <p className="font-display text-4xl leading-tight">Your restaurant.<br />Under control.</p>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/70">
            Orders, finances, inventory and team — one calm place that looks and works the way your restaurant does.
          </p>
        </div>
      </aside>
    </div>
  );
}
