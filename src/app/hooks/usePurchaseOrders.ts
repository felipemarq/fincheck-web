import { useQuery } from "@tanstack/react-query";

import { QueryKeys } from "../config/QueryKeys";
import {
  purchaseOrderService,
  type GetPurchaseOrdersParams,
} from "../services/purchaseOrderService";

export function usePurchaseOrders(
  params: GetPurchaseOrdersParams,
  enabled = true
) {
  const query = useQuery({
    queryKey: [
      QueryKeys.PURCHASE_ORDERS,
      params.entityId,
      params.search,
      params.customerId,
      params.lifecycleStatus,
      params.progress,
      params.operationalStatus,
      params.issuedFrom,
      params.issuedTo,
    ],
    queryFn: () => purchaseOrderService.getAll(params),
    enabled: enabled && Boolean(params.entityId),
    staleTime: 20_000,
  });

  return {
    ...query,
    orders: query.data,
    isFetchingOrders: query.isFetching,
  };
}
