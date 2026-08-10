import type { Quotation, QuotationInput } from "@/app/entities/Quotation";
import { httpClient } from "../httpClient";

export type CreateQuotationParams = QuotationInput & {
  entityId: string;
};

export async function create({ entityId, ...body }: CreateQuotationParams) {
  const { data } = await httpClient.post<{ quotation: Quotation }>(
    `/entities/${entityId}/quotations`,
    body
  );

  return data.quotation;
}
