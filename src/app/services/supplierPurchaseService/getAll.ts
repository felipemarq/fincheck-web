import type { Acquisition, AcquisitionStatus } from "@/app/entities/Acquisition";
import { httpClient } from "../httpClient";

export type GetSupplierPurchasesParams = {
  entityId: string;
  search?: string;
  status?: AcquisitionStatus;
};

export async function getAll({ entityId, ...params }: GetSupplierPurchasesParams) {
  const { data } = await httpClient.get<{ acquisitions: Acquisition[] }>(
    `/entities/${entityId}/supplier-purchases`,
    { params }
  );

  return data.acquisitions;
}
