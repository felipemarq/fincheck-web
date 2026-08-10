import type { Quotation } from "@/app/entities/Quotation";
import { httpClient } from "../httpClient";

export type GetQuotationParams = {
  entityId: string;
  quotationId: string;
};

export async function getOne({ entityId, quotationId }: GetQuotationParams) {
  const { data } = await httpClient.get<{ quotation: Quotation }>(
    `/entities/${entityId}/quotations/${quotationId}`
  );

  return data.quotation;
}
