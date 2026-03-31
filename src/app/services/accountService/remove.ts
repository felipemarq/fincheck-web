import { httpClient } from "../httpClient";

export interface RemoveAccountParams {
  accountId: string;
  entityId: string;
}

export const remove = async ({
  accountId,
  entityId,
}: RemoveAccountParams) => {
  await httpClient.delete(`/entities/${entityId}/accounts/${accountId}`);
};
