import { httpClient } from "../httpClient";
import type { RecurringTransaction } from "@/app/entities/RecurringTransaction";

export interface UpdateRecurringTransactionParams {
  recurringTransactionId: string;
  entityId: string;
  accountId?: string;
  categoryId?: string;
  creditCardId?: string;
  contactId?: string;
  name?: string;
  value?: number;
  type?: RecurringTransaction.Attributes["type"];
  startDate?: string;
  endDate?: string;
  recurrence?: RecurringTransaction.Recurrence;
  notes?: string;
}

interface UpdateRecurringTransactionResponse {
  recurringTransaction: RecurringTransaction.Attributes;
}

export const update = async ({
  recurringTransactionId,
  ...params
}: UpdateRecurringTransactionParams) => {
  const { data } = await httpClient.patch<UpdateRecurringTransactionResponse>(
    `/recurring-transactions/${recurringTransactionId}`,
    params
  );

  return data;
};
