import { useQuery } from "@tanstack/react-query";
import { QueryKeys } from "../config/QueryKeys";
import { creditCardService } from "../services/creditCardService";

export function useCreditCards(entityId?: string | null, active?: boolean) {
  return useQuery({
    queryKey: [QueryKeys.CREDIT_CARDS, entityId, active ?? null],
    queryFn: () => creditCardService.getAll({ entityId: entityId!, active }),
    enabled: Boolean(entityId),
  });
}
