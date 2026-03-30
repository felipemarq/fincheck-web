import { useQuery } from "@tanstack/react-query";
import { QueryKeys } from "../config/QueryKeys";
import type { GetAllAccountsParams } from "../services/accountService/getAll";
import { accountService } from "../services/accountService";

export const useAccounts = (
  params: GetAllAccountsParams,
  enabled: boolean = true
) => {
  const { data, isFetching, refetch, ...rest } = useQuery({
    queryKey: [QueryKeys.ACCOUNTS, params.entityId],
    queryFn: () => accountService.getAll(params),
    enabled: enabled && Boolean(params?.entityId),
    staleTime: 24 * 60 * 60 * 1000, // 24h
  });

  return {
    accounts: data,
    isFetchingAccounts: isFetching,
    refetchAccounts: refetch,
    ...rest,
  };
};
