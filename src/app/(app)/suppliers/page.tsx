import { requireWorkspace } from "@/lib/workspace";
import { ComingSoon } from "@/components/app/coming-soon";

export const metadata = { title: "Suppliers" };

export default async function SuppliersPage() {
  await requireWorkspace("suppliers");
  return (
    <ComingSoon
      title="Suppliers"
      description="Suppliers, purchase orders and purchase history."
      planned={["Supplier directory with contacts and products supplied", "Purchase orders: draft → sent → confirmed → received", "Receiving a PO adds stock and records the expense", "Purchase history per supplier", "Suggested reorders from low-stock items"]}
      ready={["Purchase order receiving is already implemented in the database (stock + expense in one step)", "Expenses and inventory items can already be linked to suppliers"]}
      links={[{ href: "/inventory", label: "Go to inventory" }, { href: "/finances", label: "Go to finances" }]}
    />
  );
}
