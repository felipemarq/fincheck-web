import type {
  ActivityLevel,
  CalculationSex,
  PersonalHealthProfileResult,
} from "@/app/entities/PersonalHealth";
import { httpClient } from "../httpClient";

export type UpsertPersonalHealthProfileParams = {
  onDate: string;
  targetWeightKg: number | null;
  targetDate: string | null;
  heightCm: number | null;
  birthDate: string | null;
  calculationSex: CalculationSex | null;
  activityLevel: ActivityLevel | null;
  dailyExpenditureOverrideKcal: number | null;
};

export async function upsert({
  onDate,
  ...body
}: UpsertPersonalHealthProfileParams) {
  const { data } = await httpClient.put<PersonalHealthProfileResult>(
    "/me/health-profile",
    body,
    { params: { onDate } }
  );

  return data;
}
