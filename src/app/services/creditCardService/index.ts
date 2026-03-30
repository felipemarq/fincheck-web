import { create } from "./create";
import { getAll } from "./getAll";
import { update } from "./update";

export type { CreateCreditCardParams } from "./create";
export type { GetAllCreditCardsParams } from "./getAll";
export type { UpdateCreditCardParams } from "./update";

export const creditCardService = {
  create,
  getAll,
  update,
};
