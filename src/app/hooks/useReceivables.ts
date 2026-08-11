import { useQuery } from "@tanstack/react-query";

import { QueryKeys } from "../config/QueryKeys";
import {
  receivableService,
  type GetReceivablesParams,
} from "../services/receivableService";

export function useReceivables(params: GetReceivablesParams | null) {
  return useQuery({
    queryKey: [
      QueryKeys.RECEIVABLES,
      params?.entityId,
      params?.search ?? null,
      params?.status ?? null,
      params?.dueFrom ?? null,
      params?.dueTo ?? null,
      params?.sort ?? null,
      params?.page ?? 1,
      params?.pageSize ?? 20,
    ],
    queryFn: () => receivableService.getAll(params!),
    enabled: Boolean(params?.entityId),
  });
}
