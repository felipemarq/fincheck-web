import type {
  ReceivablePayment,
  ReceivablePaymentInput,
} from "@/app/entities/Invoice";
import { httpClient } from "../httpClient";
import { invoicePath } from "./invoicePath";

export type CreatePaymentParams = ReceivablePaymentInput & {
  entityId: string;
  purchaseOrderId?: string;
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
    `${invoicePath(entityId, purchaseOrderId)}/${invoiceId}/payments`,
    body
  );

  return data.payment;
}
