import type { Product } from "@/app/entities/Product";
import { httpClient } from "../httpClient";

export type GetProductsParams = {
  entityId: string;
  search?: string;
  active?: boolean;
};

export async function getAll({
  entityId,
  search,
  active,
}: GetProductsParams) {
  const { data } = await httpClient.get<{ products: Product[] }>(
    `/entities/${entityId}/products`,
    { params: { search: search || undefined, active } }
  );

  return data.products;
}
