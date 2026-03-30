import { httpClient } from "../httpClient";

export interface RemoveTransactionParams {
  transactionId: string;
  entityId: string;
}

export const remove = async ({
  transactionId,
  entityId,
}: RemoveTransactionParams) => {
  await httpClient.delete<RemoveTransactionParams>(
    `/entities/${entityId}/transactions/${transactionId}`
  );
};
