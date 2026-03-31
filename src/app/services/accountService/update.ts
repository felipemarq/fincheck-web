import type { Account } from "@/app/entities/Account";
import { httpClient } from "../httpClient";

export interface UpdateAccountParams {
  accountId: string;
  entityId: string;
  initialBalance?: number;
  name?: string;
  type?: Account.Type;
  color?: string;
}

interface UpdateAccountResponse {
  account: Account.Attributes;
}

export const update = async ({
  accountId,
  entityId,
  ...params
}: UpdateAccountParams) => {
  const { data } = await httpClient.patch<UpdateAccountResponse>(
    `/entities/${entityId}/accounts/${accountId}`,
    params
  );

  return data.account;
};
