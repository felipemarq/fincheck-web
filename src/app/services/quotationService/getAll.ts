import type {
  QuotationStatus,
  QuotationSummary,
} from "@/app/entities/Quotation";
import { httpClient } from "../httpClient";

export type GetQuotationsParams = {
  entityId: string;
  customerId?: string;
  status?: QuotationStatus;
  search?: string;
};

export async function getAll({ entityId, ...params }: GetQuotationsParams) {
  const { data } = await httpClient.get<{ quotations: QuotationSummary[] }>(
    `/entities/${entityId}/quotations`,
    { params }
  );

  return data.quotations;
}
