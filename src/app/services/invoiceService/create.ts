import type { Invoice, InvoiceInput } from "@/app/entities/Invoice";
import { httpClient } from "../httpClient";
import { invoicePath } from "./invoicePath";

export type CreateInvoiceParams = InvoiceInput & {
  entityId: string;
  purchaseOrderId?: string;
};

export async function create({
  entityId,
  purchaseOrderId,
  ...body
}: CreateInvoiceParams) {
  const { data } = await httpClient.post<{ invoice: Invoice }>(
    invoicePath(entityId, purchaseOrderId),
    body
  );

  return data.invoice;
}
