import type { DailyCaloriesResult } from "@/app/entities/DailyCalorieEntry";
import { httpClient } from "../httpClient";

export type GetDailyCaloriesParams = {
  from?: string;
  to?: string;
};

export async function getAll(params: GetDailyCaloriesParams = {}) {
  const { data } = await httpClient.get<DailyCaloriesResult>(
    "/me/daily-calories",
    { params }
  );

  return data;
}
