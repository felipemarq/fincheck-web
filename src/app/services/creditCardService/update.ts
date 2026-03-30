import type { CreditCard } from "@/app/entities/CreditCard";
import { httpClient } from "../httpClient";

export interface UpdateCreditCardParams {
  creditCardId: string;
  entityId: string;
  accountId: string;
  name: string;
  color?: string;
  creditLimit: number;
  closingDay: number;
  dueDay: number;
}

interface UpdateCreditCardResponse {
  creditCard: CreditCard.Attributes;
}

export const update = async ({
  creditCardId,
  ...params
}: UpdateCreditCardParams) => {
  const { data } = await httpClient.patch<UpdateCreditCardResponse>(
    `/credit-cards/${creditCardId}`,
    params
  );

  return data;
};
