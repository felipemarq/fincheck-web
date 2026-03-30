import type { CreditCard } from "@/app/entities/CreditCard";
import { httpClient } from "../httpClient";

export interface CreateCreditCardParams {
  entityId: string;
  accountId: string;
  name: string;
  color?: string;
  creditLimit: number;
  closingDay: number;
  dueDay: number;
}

interface CreateCreditCardResponse {
  creditCard: CreditCard.Attributes;
}

export const create = async (params: CreateCreditCardParams) => {
  const { data } = await httpClient.post<CreateCreditCardResponse>(
    "/credit-cards",
    params
  );

  return data;
};
