import { useQuery } from "@tanstack/react-query";

import { QueryKeys } from "../config/QueryKeys";
import {
  productService,
  type GetProductsParams,
} from "../services/productService";

export function useProducts(params: GetProductsParams, enabled = true) {
  const query = useQuery({
    queryKey: [
      QueryKeys.PRODUCTS,
      params.entityId,
      params.search,
      params.active,
    ],
    queryFn: () => productService.getAll(params),
    enabled: enabled && Boolean(params.entityId),
    staleTime: 30_000,
  });

  return {
    ...query,
    products: query.data,
    isFetchingProducts: query.isFetching,
  };
}
