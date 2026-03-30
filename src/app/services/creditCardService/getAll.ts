import type { CreditCard } from "@/app/entities/CreditCard";
import { httpClient } from "../httpClient";

export interface GetAllCreditCardsParams {
  entityId: string;
  accountId?: string[];
}

interface GetAllCreditCardsResponse {
  creditCards: CreditCard.Attributes[];
}

export const getAll = async (params: GetAllCreditCardsParams) => {
  const { data } = await httpClient.get<GetAllCreditCardsResponse>(
    "/credit-cards",
    {
      params: {
        entityId: params.entityId,
        accountId: params.accountId?.join(","),
      },
    }
  );

  return data.creditCards;
};
