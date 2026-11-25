"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptInvitationAction } from "@/lib/actions/invitations";
import { Button } from "@/components/ui/button";

export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button variant="primary" size="lg" className="w-full" loading={pending} onClick={() => start(async () => {
        const r = await acceptInvitationAction(token);
        if (!r.ok) return setError(r.error);
        router.replace("/dashboard");
        router.refresh();
      })}>Aceitar convite</Button>
      {error && <p className="mt-3 text-sm text-bad">{error}</p>}
    </div>
  );
}
