import { useQuery } from "@tanstack/react-query";

import { QueryKeys } from "../config/QueryKeys";
import {
  deliveryService,
  type GetDeliveriesParams,
} from "../services/deliveryService";

export function useDeliveries(
  params: GetDeliveriesParams,
  enabled = true
) {
  const query = useQuery({
    queryKey: [
      QueryKeys.DELIVERIES,
      params.entityId,
      params.purchaseOrderId,
    ],
    queryFn: () => deliveryService.getAll(params),
    enabled:
      enabled && Boolean(params.entityId) && Boolean(params.purchaseOrderId),
  });

  return {
    ...query,
    deliveries: query.data,
    isFetchingDeliveries: query.isFetching,
  };
}
