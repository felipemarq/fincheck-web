import { httpClient } from "../httpClient";
import type { Transaction } from "@/app/entities/Transaction";

export interface UpdateTransactionParams {
  transactionId: string;
  entityId: string;
  accountId: string;
  categoryId: string;
  name: string;
  value: number;
  type: Transaction.Type;
  isPaid: boolean;
  date: string;
  dueDate?: string;
  contactId?: string;
  notes?: string;
}

interface UpdateTransactionResponse {
  transaction: Transaction.Attributes;
}

export const update = async ({
  transactionId,
  ...params
}: UpdateTransactionParams) => {
  const { data } = await httpClient.patch<UpdateTransactionResponse>(
    `/transactions/${transactionId}`,
    params
  );
  return data;
};
