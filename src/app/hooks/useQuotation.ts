import { useQuery } from "@tanstack/react-query";

import { QueryKeys } from "../config/QueryKeys";
import {
  quotationService,
  type GetQuotationParams,
} from "../services/quotationService";

export function useQuotation(params: GetQuotationParams, enabled = true) {
  const query = useQuery({
    queryKey: [QueryKeys.QUOTATIONS, params.entityId, params.quotationId],
    queryFn: () => quotationService.getOne(params),
    enabled:
      enabled && Boolean(params.entityId) && Boolean(params.quotationId),
  });

  return {
    ...query,
    quotation: query.data,
    isFetchingQuotation: query.isFetching,
  };
}
