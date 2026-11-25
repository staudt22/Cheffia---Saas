import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BarChart3, ChefHat, Package, Palette, Receipt, Users } from "lucide-react";
import { ForklyLogo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/env";
import { getUser } from "@/lib/workspace";

const features = [
  { icon: Palette, title: "Made to look like yours", text: "Your logo, your colours, your dashboard layout — Forkly adapts to your restaurant." },
  { icon: ChefHat, title: "Orders & kitchen display", text: "Every order in one queue, with a touch-friendly kitchen screen that updates live." },
  { icon: Receipt, title: "Finances without spreadsheets", text: "Revenue, expenses, recurring bills and receipts — profit at a glance." },
  { icon: Package, title: "Inventory that counts itself", text: "Recipes deduct stock as orders complete. Low-stock and expiry alerts included." },
  { icon: BarChart3, title: "Know what sells", text: "Best sellers, margins per dish and sales by hour, from your own numbers." },
  { icon: Users, title: "Your whole team", text: "Invite staff with roles you control — the kitchen sees the kitchen, the accountant sees the books." },
];

export default async function Home() {
  if (isSupabaseConfigured && (await getUser())) redirect("/dashboard");
  return (
    <div className="app-glow min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <ForklyLogo />
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost"><Link href="/login">Sign in</Link></Button>
          <Button asChild variant="primary"><Link href="/signup">Start free</Link></Button>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-5">
        <section className="py-16 sm:py-24">
          <p className="mb-4 text-sm font-medium text-brand">Restaurant management, finally calm</p>
          <h1 className="max-w-3xl font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
            Your restaurant.<br /><span className="text-gradient">Under control.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
            Forkly brings orders, finances, inventory, menu and team into one place — and makes it feel like your own system, not generic software.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="primary"><Link href="/signup">Create your workspace <ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="secondary"><Link href="/signup?demo=1">Explore a demo restaurant</Link></Button>
          </div>
        </section>
        <section className="grid gap-px overflow-hidden rounded-xl bg-line shadow-card sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="bg-surface p-6">
              <f.icon className="size-5 text-brand" />
              <h3 className="mt-4 text-[15px] font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-3">{f.text}</p>
            </div>
          ))}
        </section>
      </main>
      <footer className="mx-auto max-w-6xl px-5 py-10 text-sm text-ink-3">© {new Date().getFullYear()} Forkly</footer>
    </div>
  );
}
