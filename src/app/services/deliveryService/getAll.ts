import type { Delivery } from "@/app/entities/Delivery";
import { httpClient } from "../httpClient";

export type GetDeliveriesParams = {
  entityId: string;
  purchaseOrderId: string;
};

export async function getAll({
  entityId,
  purchaseOrderId,
}: GetDeliveriesParams) {
  const { data } = await httpClient.get<{ deliveries: Delivery[] }>(
    `/entities/${entityId}/purchase-orders/${purchaseOrderId}/deliveries`
  );

  return data.deliveries;
}
