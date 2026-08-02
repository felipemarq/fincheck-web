import { httpClient } from "../httpClient";

export type RemoveProductParams = {
  entityId: string;
  productId: string;
};

export async function remove({
  entityId,
  productId,
}: RemoveProductParams) {
  await httpClient.delete(`/entities/${entityId}/products/${productId}`);
}
