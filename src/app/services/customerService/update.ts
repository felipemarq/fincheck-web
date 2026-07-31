import type { Customer } from "@/app/entities/Customer";
import { httpClient } from "../httpClient";

export type UpdateCustomerParams = {
  entityId: string;
  customerId: string;
  legalName?: string;
  tradeName?: string | null;
  document?: string;
  email?: string | null;
  phone?: string | null;
  billingAddress?: string | null;
  deliveryAddress?: string | null;
  notes?: string | null;
  active?: boolean;
};

export async function update({
  entityId,
  customerId,
  ...body
}: UpdateCustomerParams) {
  const { data } = await httpClient.patch<{ customer: Customer }>(
    `/entities/${entityId}/customers/${customerId}`,
    body
  );

  return data.customer;
}
