import type { QuotationItemImage } from "@/app/entities/Quotation";
import { httpClient } from "../httpClient";

export type UploadQuotationImageParams = {
  entityId: string;
  quotationId: string;
  quotationItemId: string;
  fileName: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  dataBase64: string;
};

export async function uploadImage({
  entityId,
  quotationId,
  quotationItemId,
  ...body
}: UploadQuotationImageParams) {
  const { data } = await httpClient.post<{ image: QuotationItemImage }>(
    `/entities/${entityId}/quotations/${quotationId}/items/${quotationItemId}/images`,
    body
  );

  return data.image;
}
