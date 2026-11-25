import { requireWorkspace } from "@/lib/workspace";
import { ComingSoon } from "@/components/app/coming-soon";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  await requireWorkspace("analytics");
  return (
    <ComingSoon
      title="Analytics"
      description="Detailed reports and trends."
      planned={["Sales by hour and by weekday", "Sales by order source", "Best- and slow-selling items", "Food cost and waste tracking", "Inventory usage over time", "Daily / weekly / monthly reports with PDF & CSV export"]}
      ready={["Revenue, expenses, profit, top products and margins on the dashboard", "Transaction export to CSV in Finances"]}
      links={[{ href: "/dashboard", label: "Open dashboard" }, { href: "/finances?tab=transactions", label: "Export transactions" }]}
    />
  );
}
