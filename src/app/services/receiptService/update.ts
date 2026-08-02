import type {
  AcquisitionReceipt,
  AcquisitionReceiptInput,
} from "@/app/entities/AcquisitionReceipt";
import { httpClient } from "../httpClient";

export type UpdateReceiptParams = Partial<AcquisitionReceiptInput> & {
  entityId: string;
  purchaseOrderId: string;
  acquisitionId: string;
  receiptId: string;
};

export async function update({
  entityId,
  purchaseOrderId,
  acquisitionId,
  receiptId,
  ...body
}: UpdateReceiptParams) {
  const { data } = await httpClient.patch<{
    receipt: AcquisitionReceipt;
  }>(
    `/entities/${entityId}/purchase-orders/${purchaseOrderId}/acquisitions/${acquisitionId}/receipts/${receiptId}`,
    body
  );

  return data.receipt;
}
