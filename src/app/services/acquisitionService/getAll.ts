import type { Acquisition } from "@/app/entities/Acquisition";
import { httpClient } from "../httpClient";

export type GetAcquisitionsParams = {
  entityId: string;
  purchaseOrderId: string;
};

export async function getAll({
  entityId,
  purchaseOrderId,
}: GetAcquisitionsParams) {
  const { data } = await httpClient.get<{
    acquisitions: Acquisition[];
  }>(
    `/entities/${entityId}/purchase-orders/${purchaseOrderId}/acquisitions`
  );

  return data.acquisitions;
}
