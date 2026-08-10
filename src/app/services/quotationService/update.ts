import type { Quotation, QuotationInput } from "@/app/entities/Quotation";
import { httpClient } from "../httpClient";

export type UpdateQuotationParams = QuotationInput & {
  entityId: string;
  quotationId: string;
};

export async function update({
  entityId,
  quotationId,
  ...body
}: UpdateQuotationParams) {
  const { data } = await httpClient.put<{ quotation: Quotation }>(
    `/entities/${entityId}/quotations/${quotationId}`,
    body
  );

  return data.quotation;
}
