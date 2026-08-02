import type { Delivery, DeliveryInput } from "@/app/entities/Delivery";
import { httpClient } from "../httpClient";

export type UpdateDeliveryParams = Partial<DeliveryInput> & {
  entityId: string;
  purchaseOrderId: string;
  deliveryId: string;
};

export async function update({
  entityId,
  purchaseOrderId,
  deliveryId,
  ...body
}: UpdateDeliveryParams) {
  const { data } = await httpClient.patch<{ delivery: Delivery }>(
    `/entities/${entityId}/purchase-orders/${purchaseOrderId}/deliveries/${deliveryId}`,
    body
  );

  return data.delivery;
}
