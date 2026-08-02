import type { AcquisitionReceipt } from "@/app/entities/AcquisitionReceipt";
import { httpClient } from "../httpClient";

export type GetReceiptsParams = {
  entityId: string;
  purchaseOrderId: string;
  acquisitionId: string;
};

export async function getAll(params: GetReceiptsParams) {
  const { entityId, purchaseOrderId, acquisitionId } = params;
  const { data } = await httpClient.get<{
    receipts: AcquisitionReceipt[];
  }>(
    `/entities/${entityId}/purchase-orders/${purchaseOrderId}/acquisitions/${acquisitionId}/receipts`
  );

  return data.receipts;
}
