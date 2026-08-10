import type { CreditCard } from "@/app/entities/CreditCard";
import { httpClient } from "../httpClient";

export async function getAll({ entityId, active }: { entityId: string; active?: boolean }) {
  const { data } = await httpClient.get<{ creditCards: CreditCard[] }>(
    `/entities/${entityId}/credit-cards`,
    { params: { active } }
  );
  return data.creditCards;
}
