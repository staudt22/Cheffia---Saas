import { requireWorkspace } from "@/lib/workspace";
import { ComingSoon } from "@/components/app/coming-soon";

export const metadata = { title: "Equipe" };

export default async function TeamPage() {
  await requireWorkspace("team");
  return (
    <ComingSoon
      title="Equipe"
      description="Funcionários, escalas e controle de ponto."
      planned={["Ficha de cada funcionário com cargo e situação", "Escala semanal em calendário, arrastando para montar", "Disponibilidade de cada pessoa", "Registro de entrada e saída em qualquer aparelho", "Relatório de horas trabalhadas"]}
      ready={["Convidar pessoas e definir cargos em Configurações → Usuários", "Escolher o que cada cargo acessa em Configurações → Cargos e permissões"]}
      links={[{ href: "/settings?tab=users", label: "Gerenciar usuários" }, { href: "/settings?tab=roles", label: "Cargos e permissões" }]}
    />
  );
}
