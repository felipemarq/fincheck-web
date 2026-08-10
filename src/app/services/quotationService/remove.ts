import { httpClient } from "../httpClient";

export type DeleteQuotationParams = {
  entityId: string;
  quotationId: string;
};

export async function remove({
  entityId,
  quotationId,
}: DeleteQuotationParams) {
  await httpClient.delete(
    `/entities/${entityId}/quotations/${quotationId}`
  );
}
