import type { Account } from "@/app/entities/Account";
import { httpClient } from "../httpClient";

export interface GetAllAccountsParams {
  entityId: string;
}

interface GetAllAccountsResponse {
  accounts: Account.Attributes[];
}

export const getAll = async (params: GetAllAccountsParams) => {
  const { data } = await httpClient.get<GetAllAccountsResponse>(
    `/entities/${params.entityId}/accounts`
  );
  return data.accounts;
};
