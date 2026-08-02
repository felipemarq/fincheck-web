import type { OperationsDashboard } from "@/app/entities/OperationsDashboard";
import { httpClient } from "../httpClient";

export async function get(entityId: string) {
  const { data } = await httpClient.get<OperationsDashboard>(
    `/entities/${entityId}/operations-dashboard`
  );

  return data;
}
