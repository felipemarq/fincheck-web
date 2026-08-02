import { useQuery } from "@tanstack/react-query";

import { QueryKeys } from "../config/QueryKeys";
import { operationsDashboardService } from "../services/operationsDashboardService";

export function useOperationsDashboard(
  entityId: string,
  enabled = true
) {
  const query = useQuery({
    queryKey: [QueryKeys.OPERATIONS_DASHBOARD, entityId],
    queryFn: () => operationsDashboardService.get(entityId),
    enabled: enabled && Boolean(entityId),
  });

  return {
    ...query,
    dashboard: query.data,
    isFetchingDashboard: query.isFetching,
  };
}
