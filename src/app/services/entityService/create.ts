import type { Entity } from "@/app/entities/Entity";
import { httpClient } from "../httpClient";

export type CreateEntityParams = {
  name: string;
  type: Entity["type"];
  color?: string;
};

type CreateEntityResponse = {
  entity: Entity;
};

export const create = async (params: CreateEntityParams) => {
  const { data } = await httpClient.post<CreateEntityResponse>("/entities", params);
  return data.entity;
};
