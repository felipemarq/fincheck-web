import type { Entity } from "./Entity";

export type User = {
  externalId: string;
  name: string;
  email: string;
  entities: Entity[];
};
