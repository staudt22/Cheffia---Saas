import { requireWorkspace } from "@/lib/workspace";
import { ComingSoon } from "@/components/app/coming-soon";

export const metadata = { title: "AI Assistant" };

export default async function AssistantPage() {
  await requireWorkspace("assistant");
  return (
    <ComingSoon
      title="AI Assistant"
      description="Ask questions about your restaurant in plain language."
      planned={["Chat that answers from your own data only", "“How much did we spend on ingredients this month?”", "“What should I order from suppliers?”", "Never invents numbers — says when data is missing", "Runs server-side; API keys never reach the browser"]}
      ready={["Dashboard insights computed from your real numbers"]}
      links={[{ href: "/dashboard", label: "See insights" }]}
    />
  );
}
