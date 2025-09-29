import type { RecurringTransaction } from "@/app/entities/RecurringTransaction";
import { httpClient } from "../httpClient";
import type { Transaction } from "@/app/entities/Transaction";

export interface CreateRecurringParams {
  entityId: string;
  accountId: string;
  categoryId: string;
  creditCardId?: string;
  contactId?: string;
  name: string;
  value: number;
  type: Transaction.Type;
  startDate: string; // ISO
  endDate: string; // ISO
  recurrence: RecurringTransaction.Recurrence;
  notes?: string;
}

export interface CreateRecurringResponse {
  recurringTransaction: RecurringTransaction.Attributes;
}

export const create = async (params: CreateRecurringParams) => {
  const { data } = await httpClient.post<CreateRecurringResponse>(
    "/recurring-transactions",
    params
  );
  return data;
};
