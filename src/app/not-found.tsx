import Link from "next/link";
import { ForklyLogo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5 text-center">
      <ForklyLogo />
      <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
      <p className="text-sm text-ink-3">The page you&apos;re looking for doesn&apos;t exist or was moved.</p>
      <Button asChild variant="primary"><Link href="/dashboard">Back to dashboard</Link></Button>
    </div>
  );
}
