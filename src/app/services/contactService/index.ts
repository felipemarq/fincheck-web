import { create } from "./create";
import { getAll } from "./getAll";
import { remove } from "./remove";
import { update } from "./update";

export type { CreateContactParams } from "./create";
export type { GetAllContactsParams } from "./getAll";
export type { RemoveContactParams } from "./remove";
export type { UpdateContactParams } from "./update";

export const contactService = {
  create,
  getAll,
  remove,
  update,
};
