import { httpClient } from "../httpClient";

export type UpsertDailyCalorieParams = {
  loggedOn: string;
  caloriesConsumed: number;
};

export async function upsert({
  loggedOn,
  caloriesConsumed,
}: UpsertDailyCalorieParams) {
  const { data } = await httpClient.put(
    `/me/daily-calories/${loggedOn}`,
    { caloriesConsumed }
  );

  return data.entry;
}
