import type {
  Acquisition,
  AcquisitionInput,
} from "@/app/entities/Acquisition";
import { httpClient } from "../httpClient";

export type UpdateAcquisitionParams = AcquisitionInput & {
  entityId: string;
  purchaseOrderId: string;
  acquisitionId: string;
};

export async function update({
  entityId,
  purchaseOrderId,
  acquisitionId,
  ...body
}: UpdateAcquisitionParams) {
  const { data } = await httpClient.patch<{ acquisition: Acquisition }>(
    `/entities/${entityId}/purchase-orders/${purchaseOrderId}/acquisitions/${acquisitionId}`,
    body
  );

  return data.acquisition;
}
