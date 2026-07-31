export * from "./create";
export * from "./getAll";
export * from "./update";

import { create } from "./create";
import { getAll } from "./getAll";
import { update } from "./update";

export const customerService = {
  create,
  getAll,
  update,
};
