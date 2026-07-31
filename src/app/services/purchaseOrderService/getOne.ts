import type { PurchaseOrder } from "@/app/entities/PurchaseOrder";
import { httpClient } from "../httpClient";

export type GetPurchaseOrderParams = {
  entityId: string;
  purchaseOrderId: string;
};

export async function getOne({
  entityId,
  purchaseOrderId,
}: GetPurchaseOrderParams) {
  const { data } = await httpClient.get<{ order: PurchaseOrder }>(
    `/entities/${entityId}/purchase-orders/${purchaseOrderId}`
  );

  return data.order;
}
