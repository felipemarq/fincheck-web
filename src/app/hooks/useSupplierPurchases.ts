import { useQuery } from "@tanstack/react-query";

import { QueryKeys } from "../config/QueryKeys";
import {
  supplierPurchaseService,
  type GetSupplierPurchasesParams,
} from "../services/supplierPurchaseService";

export function useSupplierPurchases(
  params: GetSupplierPurchasesParams,
  enabled = true
) {
  const query = useQuery({
    queryKey: [
      QueryKeys.SUPPLIER_PURCHASES,
      params.entityId,
      params.search ?? null,
      params.status ?? null,
    ],
    queryFn: () => supplierPurchaseService.getAll(params),
    enabled: enabled && Boolean(params.entityId),
  });

  return {
    ...query,
    supplierPurchases: query.data,
    isFetchingSupplierPurchases: query.isFetching,
  };
}
