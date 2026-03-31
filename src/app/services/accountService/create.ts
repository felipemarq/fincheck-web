import type { Account } from "@/app/entities/Account";
import { httpClient } from "../httpClient";

export interface CreateAccountParams {
  entityId: string;
  initialBalance: number;
  name: string;
  type: Account.Type;
  color?: string;
}

interface CreateAccountResponse {
  account: Account.Attributes;
}

export const create = async (params: CreateAccountParams) => {
  const { data } = await httpClient.post<CreateAccountResponse>(
    "/accounts",
    params
  );
  return data;
};
