import type { Entity } from "./Entity";

export type PersonalFeature = "BODY_WEIGHT";

export type User = {
  id: string;
  externalId: string;
  name: string;
  email: string;
  features: PersonalFeature[];
  entities: Entity[];
};
