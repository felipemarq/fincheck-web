import type { Customer } from "@/app/entities/Customer";
import { httpClient } from "../httpClient";

export type CreateCustomerParams = {
  entityId: string;
  legalName: string;
  tradeName?: string;
  document: string;
  email?: string;
  phone?: string;
  billingAddress?: string;
  deliveryAddress?: string;
  notes?: string;
  active?: boolean;
};

export async function create({ entityId, ...body }: CreateCustomerParams) {
  const { data } = await httpClient.post<{ customer: Customer }>(
    `/entities/${entityId}/customers`,
    body
  );

  return data.customer;
}
