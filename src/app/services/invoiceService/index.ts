import { create } from "./create";
import { createPayment } from "./createPayment";
import { getAll } from "./getAll";
import { update } from "./update";
import { updatePayment } from "./updatePayment";

export const invoiceService = {
  create,
  createPayment,
  getAll,
  update,
  updatePayment,
};
export * from "./create";
export * from "./createPayment";
export * from "./getAll";
export * from "./update";
export * from "./updatePayment";
