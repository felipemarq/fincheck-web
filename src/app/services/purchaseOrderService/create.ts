import type {
  PurchaseOrder,
  PurchaseOrderInput,
} from "@/app/entities/PurchaseOrder";
import { httpClient } from "../httpClient";

export type CreatePurchaseOrderParams = PurchaseOrderInput & {
  entityId: string;
};

export async function create({
  entityId,
  ...body
}: CreatePurchaseOrderParams) {
  const { data } = await httpClient.post<{ order: PurchaseOrder }>(
    `/entities/${entityId}/purchase-orders`,
    body
  );

  return data.order;
}
