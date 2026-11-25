"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startTrialAction } from "@/lib/actions/billing";

export function StartTrialButton({ label, onDone, className }: { label: string; onDone?: () => void; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button size="lg" variant="primary" className={className} loading={pending} onClick={() => start(async () => {
      const r = await startTrialAction();
      if (!r.ok) return void toast.error(r.error);
      toast.success("Teste grátis ativado! Tudo liberado por 7 dias.");
      onDone?.();
      router.refresh();
    })}><Sparkles /> {label}</Button>
  );
}
