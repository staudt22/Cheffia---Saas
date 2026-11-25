import { requireWorkspace } from "@/lib/workspace";
import { ComingSoon } from "@/components/app/coming-soon";

export const metadata = { title: "Assistente IA" };

export default async function AssistantPage() {
  await requireWorkspace("assistant");
  return (
    <ComingSoon
      title="Assistente IA"
      description="Pergunte sobre o seu restaurante do jeito que você fala."
      planned={["Conversa que responde só com os seus dados", "“Quanto gastamos com ingredientes este mês?”", "“O que preciso comprar dos fornecedores?”", "Nunca inventa números — avisa quando falta informação", "Roda no servidor, com segurança"]}
      ready={["Dicas no painel calculadas com os seus números reais"]}
      links={[{ href: "/dashboard", label: "Ver dicas" }]}
    />
  );
}
