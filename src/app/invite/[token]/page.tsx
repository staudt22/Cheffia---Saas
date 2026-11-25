import Link from "next/link";
import { ForklyLogo } from "@/components/app/logo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/workspace";
import { roleLabel } from "@/lib/permissions";
import { AcceptInvite } from "@/components/app/accept-invite";
import type { AppRole } from "@/lib/types";

export const metadata = { title: "Convite" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("invitation_preview", { p_token: token });
  const invite = (data as { restaurant_name: string; role: AppRole; email: string; expired: boolean }[] | null)?.[0];
  const user = await getUser();

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-12">
      <ForklyLogo className="mb-8" />
      <Card className="p-6">
        {!invite || invite.expired ? (
          <>
            <h1 className="text-lg font-semibold">Este convite não é válido</h1>
            <p className="mt-2 text-sm text-ink-2">Ele pode ter expirado ou já ter sido usado. Peça um novo link para quem te convidou.</p>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-3">Você foi convidado para entrar em</p>
            <h1 className="mt-1 text-2xl font-semibold">{invite.restaurant_name}</h1>
            <p className="mt-2 text-sm text-ink-2">como <strong>{roleLabel(invite.role)}</strong>. O convite foi enviado para <strong>{invite.email}</strong>.</p>
            <div className="mt-6">
              {user ? (
                user.email?.toLowerCase() === invite.email.toLowerCase() ? <AcceptInvite token={token} /> : (
                  <p className="rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">Você está conectado como {user.email}. Saia e entre com {invite.email} para aceitar.</p>
                )
              ) : (
                <div className="flex flex-col gap-2">
                  <Button asChild variant="primary" size="lg"><Link href={`/signup?next=${encodeURIComponent(`/invite/${token}`)}&email=${encodeURIComponent(invite.email)}`}>Criar minha conta</Link></Button>
                  <Button asChild variant="ghost"><Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}&email=${encodeURIComponent(invite.email)}`}>Já tenho conta</Link></Button>
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
