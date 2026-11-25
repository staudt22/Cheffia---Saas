import { requireWorkspace } from "@/lib/workspace";
import { ComingSoon } from "@/components/app/coming-soon";

export const metadata = { title: "Relatórios" };

export default async function AnalyticsPage() {
  await requireWorkspace("analytics");
  return (
    <ComingSoon
      title="Relatórios"
      description="Relatórios detalhados e tendências."
      planned={["Vendas por hora e por dia da semana", "Vendas por canal (salão, delivery, apps)", "Produtos que mais e menos vendem", "Custo dos pratos e desperdício", "Consumo do estoque ao longo do tempo", "Relatórios diários, semanais e mensais em PDF e CSV"]}
      ready={["Faturamento, despesas, lucro, mais vendidos e margens no painel", "Exportar lançamentos em CSV em Finanças"]}
      links={[{ href: "/dashboard", label: "Abrir painel" }, { href: "/finances?tab=transactions", label: "Exportar lançamentos" }]}
    />
  );
}
