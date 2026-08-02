import type {
  AcquisitionReceipt,
  AcquisitionReceiptInput,
} from "@/app/entities/AcquisitionReceipt";
import { httpClient } from "../httpClient";

export type CreateReceiptParams = AcquisitionReceiptInput & {
  entityId: string;
  purchaseOrderId: string;
  acquisitionId: string;
};

export async function create({
  entityId,
  purchaseOrderId,
  acquisitionId,
  ...body
}: CreateReceiptParams) {
  const { data } = await httpClient.post<{
    receipt: AcquisitionReceipt;
  }>(
    `/entities/${entityId}/purchase-orders/${purchaseOrderId}/acquisitions/${acquisitionId}/receipts`,
    body
  );

  return data.receipt;
}
