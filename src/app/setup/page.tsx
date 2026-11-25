import { ForklyLogo } from "@/components/app/logo";
import { Card } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/env";
import { redirect } from "next/navigation";

export const metadata = { title: "Setup" };

/** Shown when the app runs without Supabase configured. */
export default function SetupPage() {
  if (isSupabaseConfigured) redirect("/");
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-5 py-12">
      <ForklyLogo className="mb-8" />
      <Card className="p-6">
        <h1 className="text-lg font-semibold">Connect Forkly to Supabase</h1>
        <p className="mt-2 text-sm text-ink-2">Forkly needs a Supabase project for its database, sign-in and file storage. It isn&apos;t configured yet.</p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-ink-2">
          <li>Create a project at supabase.com (or run <code className="rounded bg-surface-3 px-1">npx supabase start</code> locally).</li>
          <li>Apply the migrations in <code className="rounded bg-surface-3 px-1">supabase/migrations</code> with <code className="rounded bg-surface-3 px-1">npx supabase db push</code>.</li>
          <li>Copy <code className="rounded bg-surface-3 px-1">.env.example</code> to <code className="rounded bg-surface-3 px-1">.env.local</code> and fill in your project URL and publishable key.</li>
          <li>Restart the dev server.</li>
        </ol>
        <p className="mt-4 text-sm text-ink-3">The README has the full walkthrough.</p>
      </Card>
    </div>
  );
}
