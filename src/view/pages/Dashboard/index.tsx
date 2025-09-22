import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";

import data from "./data.json";
import { useDashboard } from "@/app/hooks/useDashboard";

export default function Dashboard() {
  const { dashboard, isFetchingDashboard } = useDashboard({
    entityId: "b22f92dc-c9d8-4df9-9b96-7360242e413b",
  });
  console.log(dashboard);
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <SectionCards
        dashboard={dashboard!}
        isFetchingDashboard={isFetchingDashboard}
      />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>
      <DataTable data={data} />
    </div>
  );
}
