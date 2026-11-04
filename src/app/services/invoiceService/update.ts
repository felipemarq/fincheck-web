import type { Invoice, InvoiceInput } from "@/app/entities/Invoice";
import { httpClient } from "../httpClient";
import { invoicePath } from "./invoicePath";

export type UpdateInvoiceParams = Partial<InvoiceInput> & {
  entityId: string;
  purchaseOrderId?: string;
  invoiceId: string;
};

export async function update({
  entityId,
  purchaseOrderId,
  invoiceId,
  ...body
}: UpdateInvoiceParams) {
  const { data } = await httpClient.patch<{ invoice: Invoice }>(
    `${invoicePath(entityId, purchaseOrderId)}/${invoiceId}`,
    body
  );

  return data.invoice;
}
