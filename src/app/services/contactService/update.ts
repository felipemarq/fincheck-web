import type { Contact } from "@/app/entities/Contact";
import { httpClient } from "../httpClient";

export interface UpdateContactParams {
  entityId: string;
  contactId: string;
  name?: string;
  email?: string;
  phone?: string;
}

interface UpdateContactResponse {
  contact: Contact.Attributes;
}

export const update = async ({
  entityId,
  contactId,
  ...params
}: UpdateContactParams) => {
  const { data } = await httpClient.patch<UpdateContactResponse>(
    `/entities/${entityId}/contacts/${contactId}`,
    params
  );

  return data;
};
