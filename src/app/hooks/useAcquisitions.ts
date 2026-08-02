import { useQuery } from "@tanstack/react-query";

import { QueryKeys } from "../config/QueryKeys";
import {
  acquisitionService,
  type GetAcquisitionsParams,
} from "../services/acquisitionService";

export function useAcquisitions(
  params: GetAcquisitionsParams,
  enabled = true
) {
  const query = useQuery({
    queryKey: [
      QueryKeys.ACQUISITIONS,
      params.entityId,
      params.purchaseOrderId,
    ],
    queryFn: () => acquisitionService.getAll(params),
    enabled:
      enabled && Boolean(params.entityId) && Boolean(params.purchaseOrderId),
  });

  return {
    ...query,
    acquisitions: query.data,
    isFetchingAcquisitions: query.isFetching,
  };
}
