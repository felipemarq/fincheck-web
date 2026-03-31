import type { Contact } from "@/app/entities/Contact";
import { httpClient } from "../httpClient";

export interface CreateContactParams {
  entityId: string;
  name: string;
  email?: string;
  phone?: string;
}

interface CreateContactResponse {
  contact: Contact.Attributes;
}

export const create = async ({ entityId, ...params }: CreateContactParams) => {
  const { data } = await httpClient.post<CreateContactResponse>(
    `/entities/${entityId}/contacts`,
    params
  );

  return data;
};
