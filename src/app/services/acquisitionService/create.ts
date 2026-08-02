import type {
  Acquisition,
  AcquisitionInput,
} from "@/app/entities/Acquisition";
import { httpClient } from "../httpClient";

export type CreateAcquisitionParams = AcquisitionInput & {
  entityId: string;
  purchaseOrderId: string;
};

export async function create({
  entityId,
  purchaseOrderId,
  ...body
}: CreateAcquisitionParams) {
  const { data } = await httpClient.post<{ acquisition: Acquisition }>(
    `/entities/${entityId}/purchase-orders/${purchaseOrderId}/acquisitions`,
    body
  );

  return data.acquisition;
}
