import { useQuery } from "@tanstack/react-query";
import type {
  ListRecurringTransactionsParams,
  ListRecurringTransactionsResponse,
} from "../services/recurringTransactions/getAll";
import { recurringTransactionsService } from "../services/recurringTransactions";
import { QueryKeys } from "../config/QueryKeys";

export function useRecurringTransactions(
  filters: ListRecurringTransactionsParams,
  enabled = true
) {
  const { data, isFetching, refetch } =
    useQuery<ListRecurringTransactionsResponse>({
      queryKey: [QueryKeys.RECURRING_TRANSACTIONS, filters],
      queryFn: () => recurringTransactionsService.getAll(filters),
      enabled: enabled && Boolean(filters?.entityId),
      staleTime: 60_000,
    });

  return {
    recurringTransactions: data,
    isFetchingRecurringTransactions: isFetching,
    refetchRecurringTransactions: refetch,
  };
}
