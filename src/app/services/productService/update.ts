import type { Product } from "@/app/entities/Product";
import { httpClient } from "../httpClient";

export type UpdateProductParams = {
  entityId: string;
  productId: string;
  code?: string | null;
  name?: string;
  brand?: string;
  specification?: string | null;
  packaging?: string;
  normalizedUnit?: string;
  lastPurchasePrice?: number | null;
  lastPurchaseSource?: string | null;
  lastSalePrice?: number | null;
  active?: boolean;
};

export async function update({
  entityId,
  productId,
  ...body
}: UpdateProductParams) {
  const { data } = await httpClient.patch<{ product: Product }>(
    `/entities/${entityId}/products/${productId}`,
    body
  );

  return data.product;
}
