import { useQuery } from "@tanstack/react-query";
import { QueryKeys } from "../config/QueryKeys";
import type { GetAllCategoriesParams } from "../services/categoriesService/getAll";
import { categoriesService } from "../services/categoriesService";

export const useCategories = (
  params: GetAllCategoriesParams,
  enabled: boolean = true
) => {
  const { data, isFetching, refetch, ...rest } = useQuery({
    queryKey: [QueryKeys.CATEGORIES, params.entityId],
    queryFn: () => categoriesService.getAll(params),
    enabled: enabled && Boolean(params?.entityId),
    staleTime: 24 * 60 * 60 * 1000, // 24h
  });

  return {
    categories: data,
    isFetchingCategories: isFetching,
    refetchCategories: refetch,
    ...rest,
  };
};
