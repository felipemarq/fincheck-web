import { create } from "./create";
import { getAll } from "./getAll";
import { update } from "./update";

export type { CreateSupplierPurchaseParams } from "./create";
export type { GetSupplierPurchasesParams } from "./getAll";
export type { UpdateSupplierPurchaseParams } from "./update";

export const supplierPurchaseService = { create, getAll, update };
