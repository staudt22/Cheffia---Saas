"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <Card className="mx-auto mt-10 max-w-md p-6 text-center">
      <h2 className="text-lg font-semibold">Algo deu errado</h2>
      <p className="mt-2 text-sm text-ink-3">Não conseguimos carregar esta página. Seus dados estão seguros — tente de novo em instantes.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-ink-3">Código: {error.digest}</p>}
      <Button className="mt-4" variant="primary" onClick={reset}>Tentar de novo</Button>
    </Card>
  );
}
