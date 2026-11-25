import Link from "next/link";
import { CheffeDataLogo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5 text-center">
      <CheffeDataLogo />
      <h1 className="mt-4 text-2xl font-semibold">Página não encontrada</h1>
      <p className="text-sm text-ink-3">A página que você procura não existe ou mudou de lugar.</p>
      <Button asChild variant="primary"><Link href="/dashboard">Voltar ao painel</Link></Button>
    </div>
  );
}
