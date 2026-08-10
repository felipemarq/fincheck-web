import type { Product } from "@/app/entities/Product";
import { httpClient } from "../httpClient";

export type CreateProductParams = {
  entityId: string;
  code?: string;
  name: string;
  brand?: string;
  specification?: string;
  packaging: string;
  normalizedUnit: string;
  lastPurchasePrice?: number;
  lastPurchaseSource?: string;
  lastSalePrice?: number;
  active?: boolean;
};

export async function create({ entityId, ...body }: CreateProductParams) {
  const { data } = await httpClient.post<{ product: Product }>(
    `/entities/${entityId}/products`,
    body
  );

  return data.product;
}
