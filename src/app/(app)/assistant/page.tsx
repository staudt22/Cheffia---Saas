import { requireWorkspace } from "@/lib/workspace";
import { assistantDailyLimit, planAllows } from "@/lib/billing";
import { toolsFor } from "@/lib/assistant/tools";
import { AssistantChat } from "@/components/assistant/assistant-chat";

export const metadata = { title: "Assistente IA" };

export default async function AssistantPage() {
  const ws = await requireWorkspace("assistant");
  const status = !planAllows(ws.restaurant.plan, "assistant") ? "plan" : !process.env.ANTHROPIC_API_KEY ? "not_configured" : "ready";
  const areas = toolsFor(ws.permissions).map((t) => t.name);
  return <AssistantChat status={status} firstName={ws.user.fullName.split(" ")[0] ?? ""} dailyLimit={assistantDailyLimit(ws.restaurant.plan)} areas={areas} />;
}
