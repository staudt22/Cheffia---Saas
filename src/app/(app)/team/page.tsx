import { requireWorkspace } from "@/lib/workspace";
import { ComingSoon } from "@/components/app/coming-soon";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  await requireWorkspace("team");
  return (
    <ComingSoon
      title="Team"
      description="Employees, shifts and time tracking."
      planned={["Employee profiles with position and status", "Weekly shift calendar with drag-to-assign", "Availability per employee", "Clock-in / clock-out from any device", "Hours worked and time-tracking reports"]}
      ready={["Invite people and assign roles in Settings → Users", "Control what each role can access in Settings → Roles & permissions"]}
      links={[{ href: "/settings?tab=users", label: "Manage users" }, { href: "/settings?tab=roles", label: "Roles & permissions" }]}
    />
  );
}
