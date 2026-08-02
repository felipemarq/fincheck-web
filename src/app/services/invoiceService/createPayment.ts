import type {
  ReceivablePayment,
  ReceivablePaymentInput,
} from "@/app/entities/Invoice";
import { httpClient } from "../httpClient";

export type CreatePaymentParams = ReceivablePaymentInput & {
  entityId: string;
  purchaseOrderId: string;
  invoiceId: string;
};

export async function createPayment({
  entityId,
  purchaseOrderId,
  invoiceId,
  ...body
}: CreatePaymentParams) {
  const { data } = await httpClient.post<{
    payment: ReceivablePayment;
  }>(
    `/entities/${entityId}/purchase-orders/${purchaseOrderId}/invoices/${invoiceId}/payments`,
    body
  );

  return data.payment;
}
