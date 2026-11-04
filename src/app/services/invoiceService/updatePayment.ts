import type {
  ReceivablePayment,
  ReceivablePaymentInput,
} from "@/app/entities/Invoice";
import { httpClient } from "../httpClient";
import { invoicePath } from "./invoicePath";

export type UpdatePaymentParams = Partial<ReceivablePaymentInput> & {
  entityId: string;
  purchaseOrderId?: string;
  invoiceId: string;
  paymentId: string;
};

export async function updatePayment({
  entityId,
  purchaseOrderId,
  invoiceId,
  paymentId,
  ...body
}: UpdatePaymentParams) {
  const { data } = await httpClient.patch<{
    payment: ReceivablePayment;
  }>(
    `${invoicePath(entityId, purchaseOrderId)}/${invoiceId}/payments/${paymentId}`,
    body
  );

  return data.payment;
}
