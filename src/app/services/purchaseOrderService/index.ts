export * from "./create";
export * from "./getAll";
export * from "./getOne";
export * from "./update";

import { create } from "./create";
import { getAll } from "./getAll";
import { getOne } from "./getOne";
import { update } from "./update";

export const purchaseOrderService = {
  create,
  getAll,
  getOne,
  update,
};
