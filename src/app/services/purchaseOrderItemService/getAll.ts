import type {
  PurchaseOrderItemDeadlineFilter,
  PurchaseOrderItemProcurementStatus,
  PurchaseOrderItemQueuePage,
  PurchaseOrderItemSort,
} from "@/app/entities/PurchaseOrderItemQueue";
import { httpClient } from "../httpClient";

export type GetPurchaseOrderItemsParams = {
  entityId: string;
  purchaseOrderItemId?: string;
  search?: string;
  customerId?: string;
  status?: PurchaseOrderItemProcurementStatus;
  deadline?: PurchaseOrderItemDeadlineFilter;
  sort?: PurchaseOrderItemSort;
  page?: number;
  pageSize?: number;
};

export async function getAll({
  entityId,
  ...params
}: GetPurchaseOrderItemsParams) {
  const { data } = await httpClient.get<PurchaseOrderItemQueuePage>(
    `/entities/${entityId}/purchase-order-items`,
    { params }
  );

  return data;
}
