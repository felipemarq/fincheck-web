import type { Invoice, InvoiceInput } from "@/app/entities/Invoice";
import { httpClient } from "../httpClient";

export type CreateInvoiceParams = InvoiceInput & {
  entityId: string;
  purchaseOrderId: string;
};

export async function create({
  entityId,
  purchaseOrderId,
  ...body
}: CreateInvoiceParams) {
  const { data } = await httpClient.post<{ invoice: Invoice }>(
    `/entities/${entityId}/purchase-orders/${purchaseOrderId}/invoices`,
    body
  );

  return data.invoice;
}
