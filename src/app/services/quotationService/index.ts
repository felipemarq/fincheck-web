export * from "./create";
export * from "./deleteImage";
export * from "./getAll";
export * from "./getOne";
export * from "./remove";
export * from "./update";
export * from "./uploadImage";

import { create } from "./create";
import { deleteImage } from "./deleteImage";
import { getAll } from "./getAll";
import { getOne } from "./getOne";
import { remove } from "./remove";
import { update } from "./update";
import { uploadImage } from "./uploadImage";

export const quotationService = {
  create,
  deleteImage,
  getAll,
  getOne,
  remove,
  update,
  uploadImage,
};
