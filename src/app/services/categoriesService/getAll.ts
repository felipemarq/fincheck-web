import { httpClient } from "../httpClient";
import type { Category } from "@/app/entities/Category";

export interface GetAllCategoriesParams {
  entityId: string;
}

interface GetAllCategoriesResponse {
  categories: Category.Attributes[];
}

export const getAll = async (params: GetAllCategoriesParams) => {
  const { data } = await httpClient.get<GetAllCategoriesResponse>(
    `/categories`,
    {
      params,
    }
  );
  return data.categories;
};
