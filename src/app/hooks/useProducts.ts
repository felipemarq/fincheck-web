import { useQuery } from "@tanstack/react-query";

import { productQueryKeys } from "../config/QueryKeys";
import {
  productService,
  type GetProductsParams,
} from "../services/productService";

export function useProducts(params: GetProductsParams, enabled = true) {
  const query = useQuery({
    queryKey: productQueryKeys.list(params),
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
