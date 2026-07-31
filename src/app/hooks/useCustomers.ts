import { useQuery } from "@tanstack/react-query";

import { QueryKeys } from "../config/QueryKeys";
import {
  customerService,
  type GetCustomersParams,
} from "../services/customerService";

export function useCustomers(params: GetCustomersParams, enabled = true) {
  const query = useQuery({
    queryKey: [
      QueryKeys.CUSTOMERS,
      params.entityId,
      params.search,
      params.active,
    ],
    queryFn: () => customerService.getAll(params),
    enabled: enabled && Boolean(params.entityId),
    staleTime: 30_000,
  });

  return {
    ...query,
    customers: query.data,
    isFetchingCustomers: query.isFetching,
  };
}
