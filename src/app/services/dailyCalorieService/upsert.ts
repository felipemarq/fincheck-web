import { httpClient } from "../httpClient";

export type UpsertDailyCalorieParams = {
  loggedOn: string;
  caloriesConsumed: number;
  caloriesBurned: number | null;
};

export async function upsert({
  loggedOn,
  caloriesConsumed,
  caloriesBurned,
}: UpsertDailyCalorieParams) {
  const { data } = await httpClient.put(
    `/me/daily-calories/${loggedOn}`,
    { caloriesConsumed, caloriesBurned }
  );

  return data.entry;
}
