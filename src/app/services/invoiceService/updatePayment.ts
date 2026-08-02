import type {
  ReceivablePayment,
  ReceivablePaymentInput,
} from "@/app/entities/Invoice";
import { httpClient } from "../httpClient";

export type UpdatePaymentParams = Partial<ReceivablePaymentInput> & {
  entityId: string;
  purchaseOrderId: string;
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
    `/entities/${entityId}/purchase-orders/${purchaseOrderId}/invoices/${invoiceId}/payments/${paymentId}`,
    body
  );

  return data.payment;
}
