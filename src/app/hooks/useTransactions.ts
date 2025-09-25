// hooks/useTransactions.ts
import { useQuery } from "@tanstack/react-query";
import type {
  ListTransactionsParams,
  ListTransactionsResponse,
} from "../services/transactionService/getAll";
import { transactionService } from "../services/transactionService";
import { QueryKeys } from "../config/QueryKeys";

export function useTransactions(
  filters: ListTransactionsParams,
  enabled = true
) {
  const { data, isFetching, refetch } = useQuery<ListTransactionsResponse>({
    queryKey: [QueryKeys.TRANSACTIONS, filters],
    queryFn: () => transactionService.getAll(filters),
    enabled: enabled && Boolean(filters?.entityId),
    staleTime: 60_000,
  });

  return {
    transactions: data,
    isFetchingTransactions: isFetching,
    refetchTransactions: refetch,
  };
}
