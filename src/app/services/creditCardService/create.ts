import type { CreditCard, CreditCardInput } from "@/app/entities/CreditCard";
import { httpClient } from "../httpClient";

export async function create({ entityId, ...body }: CreditCardInput & { entityId: string }) {
  const { data } = await httpClient.post<{ creditCard: CreditCard }>(
    `/entities/${entityId}/credit-cards`,
    body
  );
  return data.creditCard;
}
