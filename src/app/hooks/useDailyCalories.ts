import { useQuery } from "@tanstack/react-query";
import { QueryKeys } from "../config/QueryKeys";
import { dailyCalorieService } from "../services/dailyCalorieService";
import type { GetDailyCaloriesParams } from "../services/dailyCalorieService/getAll";

export function useDailyCalories(params: GetDailyCaloriesParams) {
  return useQuery({
    queryKey: [QueryKeys.DAILY_CALORIES, params.from ?? null, params.to ?? null],
    queryFn: () => dailyCalorieService.getAll(params),
  });
}
