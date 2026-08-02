import type { Delivery, DeliveryInput } from "@/app/entities/Delivery";
import { httpClient } from "../httpClient";

export type CreateDeliveryParams = DeliveryInput & {
  entityId: string;
  purchaseOrderId: string;
};

export async function create({
  entityId,
  purchaseOrderId,
  ...body
}: CreateDeliveryParams) {
  const { data } = await httpClient.post<{ delivery: Delivery }>(
    `/entities/${entityId}/purchase-orders/${purchaseOrderId}/deliveries`,
    body
  );

  return data.delivery;
}
