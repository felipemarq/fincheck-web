import { httpClient } from "../httpClient";

export interface RemoveContactParams {
  entityId: string;
  contactId: string;
}

export const remove = async ({
  entityId,
  contactId,
}: RemoveContactParams) => {
  await httpClient.delete(`/entities/${entityId}/contacts/${contactId}`);
};
