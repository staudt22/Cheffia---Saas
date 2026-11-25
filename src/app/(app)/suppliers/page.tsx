import { requireWorkspace } from "@/lib/workspace";
import { ComingSoon } from "@/components/app/coming-soon";

export const metadata = { title: "Fornecedores" };

export default async function SuppliersPage() {
  await requireWorkspace("suppliers");
  return (
    <ComingSoon
      title="Fornecedores"
      description="Fornecedores, pedidos de compra e histórico de compras."
      planned={["Cadastro de fornecedores com contatos e produtos", "Pedidos de compra: rascunho → enviado → confirmado → recebido", "Ao receber a compra, o estoque e a despesa são lançados sozinhos", "Histórico de compras por fornecedor", "Sugestão de compra a partir do estoque baixo"]}
      ready={["O recebimento de compras já está pronto no banco de dados (estoque + despesa de uma vez)", "Despesas e itens de estoque já podem ser ligados a fornecedores"]}
      links={[{ href: "/inventory", label: "Ir para o estoque" }, { href: "/finances", label: "Ir para finanças" }]}
    />
  );
}
