import type {
  PurchaseOrder,
  PurchaseOrderInput,
} from "@/app/entities/PurchaseOrder";
import { httpClient } from "../httpClient";

export type UpdatePurchaseOrderParams = PurchaseOrderInput & {
  entityId: string;
  purchaseOrderId: string;
};

export async function update({
  entityId,
  purchaseOrderId,
  ...body
}: UpdatePurchaseOrderParams) {
  const { data } = await httpClient.patch<{ order: PurchaseOrder }>(
    `/entities/${entityId}/purchase-orders/${purchaseOrderId}`,
    body
  );

  return data.order;
}
