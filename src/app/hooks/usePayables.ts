import { useQuery } from "@tanstack/react-query";
import { QueryKeys } from "../config/QueryKeys";
import { payableService } from "../services/payableService";
import type { GetPayablesParams } from "../services/payableService/getAll";

export function usePayables(params: GetPayablesParams | null) {
  return useQuery({
    queryKey: [QueryKeys.PAYABLES, params],
    queryFn: () => payableService.getAll(params!),
    enabled: Boolean(params?.entityId),
  });
}
