import type { PayablesResult, PayableStatus } from "@/app/entities/Payable";
import { httpClient } from "../httpClient";

export type GetPayablesParams = {
  entityId: string;
  status?: PayableStatus;
  creditCardId?: string;
  search?: string;
};

export async function getAll({ entityId, ...params }: GetPayablesParams) {
  const { data } = await httpClient.get<PayablesResult>(
    `/entities/${entityId}/payables`,
    { params }
  );
  return data;
}
