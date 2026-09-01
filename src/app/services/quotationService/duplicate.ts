import type { Quotation } from "@/app/entities/Quotation";
import { httpClient } from "../httpClient";

export type DuplicateQuotationParams = {
  entityId: string;
  quotationId: string;
};

export async function duplicate({
  entityId,
  quotationId,
}: DuplicateQuotationParams) {
  const { data } = await httpClient.post<{ quotation: Quotation }>(
    `/entities/${entityId}/quotations/${quotationId}/duplicate`
  );

  return data.quotation;
}
