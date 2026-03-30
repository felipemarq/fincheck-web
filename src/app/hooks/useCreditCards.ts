import { useQuery } from "@tanstack/react-query";
import { QueryKeys } from "../config/QueryKeys";
import {
  creditCardService,
  type GetAllCreditCardsParams,
} from "../services/creditCardService";

export const useCreditCards = (
  params: GetAllCreditCardsParams,
  enabled = true
) => {
  const { data, isFetching, refetch, ...rest } = useQuery({
    queryKey: [QueryKeys.CREDIT_CARDS, params.entityId, params.accountId],
    queryFn: () => creditCardService.getAll(params),
    enabled: enabled && Boolean(params.entityId),
    staleTime: 60_000,
  });

  return {
    creditCards: data,
    isFetchingCreditCards: isFetching,
    refetchCreditCards: refetch,
    ...rest,
  };
};
