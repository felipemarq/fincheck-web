import type { Acquisition, AcquisitionInput } from "@/app/entities/Acquisition";
import { httpClient } from "../httpClient";

export type UpdateSupplierPurchaseParams = Partial<AcquisitionInput> & {
  entityId: string;
  acquisitionId: string;
};

export async function update({
  entityId,
  acquisitionId,
  ...body
}: UpdateSupplierPurchaseParams) {
  const { data } = await httpClient.patch<{ acquisition: Acquisition }>(
    `/entities/${entityId}/supplier-purchases/${acquisitionId}`,
    body
  );

  return data.acquisition;
}
