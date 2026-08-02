export * from "./create";
export * from "./getAll";
export * from "./remove";
export * from "./update";

import { create } from "./create";
import { getAll } from "./getAll";
import { remove } from "./remove";
import { update } from "./update";

export const productService = { create, getAll, remove, update };
