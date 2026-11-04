import type { Invoice } from "@/app/entities/Invoice";
import { httpClient } from "../httpClient";
import { invoicePath } from "./invoicePath";

export type GetInvoicesParams = {
  entityId: string;
  purchaseOrderId?: string;
};

export async function getAll({
  entityId,
  purchaseOrderId,
}: GetInvoicesParams) {
  const { data } = await httpClient.get<{ invoices: Invoice[] }>(
    invoicePath(entityId, purchaseOrderId)
  );

  return data.invoices;
}
