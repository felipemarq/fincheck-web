import type { Payable, PayableStatus } from "@/app/entities/Payable";
import { httpClient } from "../httpClient";

export async function update({ entityId, payableId, status, paidAt }: {
  entityId: string;
  payableId: string;
  status: Extract<PayableStatus, "OPEN" | "PAID">;
  paidAt?: string;
}) {
  const { data } = await httpClient.patch<{ payable: Payable }>(
    `/entities/${entityId}/payables/${payableId}`,
    { status, paidAt }
  );
  return data.payable;
}
