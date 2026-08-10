import type { CreditCardStatementSettlement } from "@/app/entities/Payable";
import { httpClient } from "../httpClient";

export type SettleCreditCardStatementParams = {
  entityId: string;
  creditCardId: string;
  year: number;
  month: number;
  paidAt?: string;
};

export async function settleCreditCardStatement({
  entityId,
  ...body
}: SettleCreditCardStatementParams) {
  const { data } = await httpClient.post<{
    settlement: CreditCardStatementSettlement;
  }>(`/entities/${entityId}/payables/card-statements/settle`, body);

  return data.settlement;
}
