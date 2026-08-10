import type { OperationsDashboard } from "@/app/entities/OperationsDashboard";
import { httpClient } from "../httpClient";

export type GetOperationsDashboardParams = {
  issuedFrom?: string;
  issuedTo?: string;
};

export async function get(
  entityId: string,
  params: GetOperationsDashboardParams = {}
) {
  const { data } = await httpClient.get<OperationsDashboard>(
    `/entities/${entityId}/operations-dashboard`,
    { params }
  );

  return data;
}
