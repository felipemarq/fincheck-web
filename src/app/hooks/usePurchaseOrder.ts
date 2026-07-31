import { useQuery } from "@tanstack/react-query";

import { QueryKeys } from "../config/QueryKeys";
import {
  purchaseOrderService,
  type GetPurchaseOrderParams,
} from "../services/purchaseOrderService";

export function usePurchaseOrder(
  params: GetPurchaseOrderParams,
  enabled = true
) {
  const query = useQuery({
    queryKey: [
      QueryKeys.PURCHASE_ORDERS,
      params.entityId,
      params.purchaseOrderId,
    ],
    queryFn: () => purchaseOrderService.getOne(params),
    enabled:
      enabled && Boolean(params.entityId) && Boolean(params.purchaseOrderId),
  });

  return {
    ...query,
    order: query.data,
    isFetchingOrder: query.isFetching,
  };
}
