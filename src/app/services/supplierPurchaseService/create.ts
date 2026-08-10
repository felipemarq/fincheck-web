import type { Acquisition, AcquisitionInput } from "@/app/entities/Acquisition";
import { httpClient } from "../httpClient";

export type CreateSupplierPurchaseParams = AcquisitionInput & {
  entityId: string;
};

export async function create({ entityId, ...body }: CreateSupplierPurchaseParams) {
  const { data } = await httpClient.post<{ acquisition: Acquisition }>(
    `/entities/${entityId}/supplier-purchases`,
    body
  );

  return data.acquisition;
}
