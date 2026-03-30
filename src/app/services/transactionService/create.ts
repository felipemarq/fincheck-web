import { httpClient } from "../httpClient";
import type { Transaction } from "@/app/entities/Transaction";

export interface CreateTransactionParams {
  entityId: string;
  accountId: string;
  categoryId: string;
  name: string;
  value: number;
  type: Transaction.Type;
  isPaid: boolean;
  date: string;
  dueDate?: string;
  notes?: string;
}

interface CreateTransactionResponse {
  transaction: Transaction.Attributes;
}

export const create = async (params: CreateTransactionParams) => {
  const { data } = await httpClient.post<CreateTransactionResponse>(
    "/transactions",
    params,
  );
  return data;
};
