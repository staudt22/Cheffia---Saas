import Link from "next/link";
import { ForklyLogo } from "@/components/app/logo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/workspace";
import { roleLabel } from "@/lib/permissions";
import { AcceptInvite } from "@/components/app/accept-invite";
import type { AppRole } from "@/lib/types";

export const metadata = { title: "Invitation" };

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
            <h1 className="text-lg font-semibold">This invitation isn&apos;t valid</h1>
            <p className="mt-2 text-sm text-ink-2">It may have expired or already been used. Ask the person who invited you for a new link.</p>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-3">You&apos;re invited to join</p>
            <h1 className="mt-1 font-display text-2xl">{invite.restaurant_name}</h1>
            <p className="mt-2 text-sm text-ink-2">as <strong>{roleLabel(invite.role)}</strong>. This invitation was sent to <strong>{invite.email}</strong>.</p>
            <div className="mt-6">
              {user ? (
                user.email?.toLowerCase() === invite.email.toLowerCase() ? <AcceptInvite token={token} /> : (
                  <p className="rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">You&apos;re signed in as {user.email}. Sign out and sign in with {invite.email} to accept.</p>
                )
              ) : (
                <div className="flex flex-col gap-2">
                  <Button asChild variant="primary" size="lg"><Link href={`/signup?next=${encodeURIComponent(`/invite/${token}`)}&email=${encodeURIComponent(invite.email)}`}>Create an account</Link></Button>
                  <Button asChild variant="ghost"><Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}&email=${encodeURIComponent(invite.email)}`}>I already have an account</Link></Button>
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
