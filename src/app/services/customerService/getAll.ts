import type { Customer } from "@/app/entities/Customer";
import { httpClient } from "../httpClient";

export type GetCustomersParams = {
  entityId: string;
  search?: string;
  active?: boolean;
};

export async function getAll({
  entityId,
  search,
  active,
}: GetCustomersParams) {
  const { data } = await httpClient.get<{ customers: Customer[] }>(
    `/entities/${entityId}/customers`,
    {
      params: {
        search: search || undefined,
        active,
      },
    }
  );

  return data.customers;
}
