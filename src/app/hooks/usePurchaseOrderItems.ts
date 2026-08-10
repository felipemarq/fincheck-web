import { useQuery } from "@tanstack/react-query";

import { QueryKeys } from "../config/QueryKeys";
import {
  purchaseOrderItemService,
  type GetPurchaseOrderItemsParams,
} from "../services/purchaseOrderItemService";

export function usePurchaseOrderItems(
  params: GetPurchaseOrderItemsParams,
  enabled = true
) {
  const query = useQuery({
    queryKey: [
      QueryKeys.PURCHASE_ORDER_ITEMS,
      params.entityId,
      params.purchaseOrderItemId ?? null,
      params.search ?? null,
      params.customerId ?? null,
      params.status ?? null,
      params.deadline ?? null,
      params.sort ?? "URGENCY",
      params.page ?? 1,
      params.pageSize ?? 20,
    ],
    queryFn: () => purchaseOrderItemService.getAll(params),
    enabled: enabled && Boolean(params.entityId),
    placeholderData: (previousData) => previousData,
  });

  return {
    ...query,
    items: query.data?.items,
    summary: query.data?.summary,
    pagination: query.data?.pagination,
    isFetchingItems: query.isFetching,
  };
}
