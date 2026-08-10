import type { CreditCard, CreditCardInput } from "@/app/entities/CreditCard";
import { httpClient } from "../httpClient";

export async function update({ entityId, creditCardId, ...body }: CreditCardInput & { entityId: string; creditCardId: string }) {
  const { data } = await httpClient.patch<{ creditCard: CreditCard }>(
    `/entities/${entityId}/credit-cards/${creditCardId}`,
    body
  );
  return data.creditCard;
}
