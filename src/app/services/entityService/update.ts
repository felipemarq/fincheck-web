import type { Entity } from "@/app/entities/Entity";
import { httpClient } from "../httpClient";

export type UpdateEntityParams = {
  entityId: string;
  name?: string;
  type?: Entity["type"];
  color?: string;
};

type UpdateEntityResponse = {
  entity: Entity;
};

export const update = async ({
  entityId,
  ...params
}: UpdateEntityParams) => {
  const { data } = await httpClient.patch<UpdateEntityResponse>(
    `/entities/${entityId}`,
    params
  );
  return data.entity;
};
