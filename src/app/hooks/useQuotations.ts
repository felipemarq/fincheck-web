import { useQuery } from "@tanstack/react-query";

import { QueryKeys } from "../config/QueryKeys";
import {
  quotationService,
  type GetQuotationsParams,
} from "../services/quotationService";

export function useQuotations(params: GetQuotationsParams, enabled = true) {
  const query = useQuery({
    queryKey: [
      QueryKeys.QUOTATIONS,
      params.entityId,
      params.customerId,
      params.status,
      params.search,
    ],
    queryFn: () => quotationService.getAll(params),
    enabled: enabled && Boolean(params.entityId),
    staleTime: 20_000,
  });

  return {
    ...query,
    quotations: query.data,
    isFetchingQuotations: query.isFetching,
  };
}
