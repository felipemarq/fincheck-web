import { create } from "./create";
import { getAll } from "./getAll";
import { update } from "./update";

export type { CreateAcquisitionParams } from "./create";
export type { GetAcquisitionsParams } from "./getAll";
export type { UpdateAcquisitionParams } from "./update";

export const acquisitionService = {
  create,
  getAll,
  update,
};
