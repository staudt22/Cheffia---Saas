import { redirect } from "next/navigation";
import { getUser, getWorkspace } from "@/lib/workspace";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export const metadata = { title: "Configure seu restaurante" };
export const maxDuration = 120;

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ demo?: string; new?: string }> }) {
  const user = await getUser();
  if (!user) redirect("/login?next=/onboarding");
  const params = await searchParams;
  const ws = await getWorkspace();
  // "?new=1" lets an existing user add another restaurant.
  const restaurant = params.new ? null : ws?.restaurant ?? null;
  if (restaurant?.onboarding_completed_at) redirect("/dashboard");

  return (
    <OnboardingWizard
      restaurant={restaurant}
      userName={(user.user_metadata?.full_name as string | undefined) ?? user.email ?? ""}
      initialStep={restaurant ? Math.min(Math.max(restaurant.onboarding_step, 3), 10) : 2}
      demoFirst={params.demo === "1"}
    />
  );
}
