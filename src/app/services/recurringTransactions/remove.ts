import { httpClient } from "../httpClient";

export interface RemoveRecurringTransactionParams {
  recurringTransactionId: string;
  entityId: string;
}

export const remove = async ({
  recurringTransactionId,
  entityId,
}: RemoveRecurringTransactionParams) => {
  await httpClient.delete(
    `/entities/${entityId}/recurring-transactions/${recurringTransactionId}`
  );
};
