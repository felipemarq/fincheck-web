import type { Invoice } from "@/app/entities/Invoice";
import { httpClient } from "../httpClient";

export type GetInvoicesParams = {
  entityId: string;
  purchaseOrderId: string;
};

export async function getAll({
  entityId,
  purchaseOrderId,
}: GetInvoicesParams) {
  const { data } = await httpClient.get<{ invoices: Invoice[] }>(
    `/entities/${entityId}/purchase-orders/${purchaseOrderId}/invoices`
  );

  return data.invoices;
}
