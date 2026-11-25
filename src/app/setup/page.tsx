import { ForklyLogo } from "@/components/app/logo";
import { Card } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/env";
import { redirect } from "next/navigation";

export const metadata = { title: "Configuração" };

/** Shown when the app runs without Supabase configured. */
export default function SetupPage() {
  if (isSupabaseConfigured) redirect("/");
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-5 py-12">
      <ForklyLogo className="mb-8" />
      <Card className="p-6">
        <h1 className="text-lg font-semibold">Conecte o Forkly ao Supabase</h1>
        <p className="mt-2 text-sm text-ink-2">O Forkly precisa de um projeto Supabase para o banco de dados, o login e os arquivos. Ele ainda não foi configurado.</p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-ink-2">
          <li>Crie um projeto em supabase.com (ou rode <code className="rounded bg-surface-3 px-1">npx supabase start</code> localmente).</li>
          <li>Aplique as migrations de <code className="rounded bg-surface-3 px-1">supabase/migrations</code> com <code className="rounded bg-surface-3 px-1">npx supabase db push</code>.</li>
          <li>Copie <code className="rounded bg-surface-3 px-1">.env.example</code> para <code className="rounded bg-surface-3 px-1">.env.local</code> e preencha a URL e a chave publishable.</li>
          <li>Reinicie o servidor.</li>
        </ol>
        <p className="mt-4 text-sm text-ink-3">O README tem o passo a passo completo.</p>
      </Card>
    </div>
  );
}
