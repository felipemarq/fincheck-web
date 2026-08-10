import type {
  PurchaseOrderLifecycleStatus,
  PurchaseOrderOperationalStatus,
  PurchaseOrderProgress,
  PurchaseOrderSummary,
} from "@/app/entities/PurchaseOrder";
import { httpClient } from "../httpClient";

export type GetPurchaseOrdersParams = {
  entityId: string;
  search?: string;
  customerId?: string;
  lifecycleStatus?: PurchaseOrderLifecycleStatus;
  progress?: PurchaseOrderProgress;
  operationalStatus?: PurchaseOrderOperationalStatus;
  issuedFrom?: string;
  issuedTo?: string;
};

export async function getAll({
  entityId,
  ...params
}: GetPurchaseOrdersParams) {
  const { data } = await httpClient.get<{ orders: PurchaseOrderSummary[] }>(
    `/entities/${entityId}/purchase-orders`,
    { params }
  );

  return data.orders;
}
