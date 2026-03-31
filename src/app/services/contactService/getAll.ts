import type { Contact } from "@/app/entities/Contact";
import { httpClient } from "../httpClient";

export interface GetAllContactsParams {
  entityId: string;
}

interface GetAllContactsResponse {
  contacts: Contact.Attributes[];
}

export const getAll = async ({ entityId }: GetAllContactsParams) => {
  const { data } = await httpClient.get<GetAllContactsResponse>(
    `/entities/${entityId}/contacts`
  );

  return data.contacts;
};
