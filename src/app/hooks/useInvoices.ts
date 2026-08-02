import { useQuery } from "@tanstack/react-query";

import { QueryKeys } from "../config/QueryKeys";
import {
  invoiceService,
  type GetInvoicesParams,
} from "../services/invoiceService";

export function useInvoices(params: GetInvoicesParams, enabled = true) {
  const query = useQuery({
    queryKey: [
      QueryKeys.INVOICES,
      params.entityId,
      params.purchaseOrderId,
    ],
    queryFn: () => invoiceService.getAll(params),
    enabled:
      enabled && Boolean(params.entityId) && Boolean(params.purchaseOrderId),
  });

  return {
    ...query,
    invoices: query.data,
    isFetchingInvoices: query.isFetching,
  };
}
