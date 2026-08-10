import { httpClient } from "../httpClient";

export type DeleteQuotationImageParams = {
  entityId: string;
  quotationId: string;
  imageId: string;
};

export async function deleteImage({
  entityId,
  quotationId,
  imageId,
}: DeleteQuotationImageParams) {
  await httpClient.delete(
    `/entities/${entityId}/quotations/${quotationId}/images/${imageId}`
  );
}
