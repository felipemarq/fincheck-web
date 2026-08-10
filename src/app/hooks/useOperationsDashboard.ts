import { useQuery } from "@tanstack/react-query";

import { QueryKeys } from "../config/QueryKeys";
import { operationsDashboardService } from "../services/operationsDashboardService";
import type { GetOperationsDashboardParams } from "../services/operationsDashboardService/get";

export function useOperationsDashboard(
  entityId: string,
  enabled = true,
  params: GetOperationsDashboardParams = {}
) {
  const query = useQuery({
    queryKey: [
      QueryKeys.OPERATIONS_DASHBOARD,
      entityId,
      params.issuedFrom,
      params.issuedTo,
    ],
    queryFn: () => operationsDashboardService.get(entityId, params),
    enabled: enabled && Boolean(entityId),
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[1] === entityId ? previousData : undefined,
  });

  return {
    ...query,
    dashboard: query.data,
    isFetchingDashboard: query.isFetching,
  };
}
