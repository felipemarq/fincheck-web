import type { EnergyCalculation } from "./PersonalHealth";

export type CaloriesBurnedSource =
  | "DAILY"
  | "PROFILE_OVERRIDE"
  | "ESTIMATE"
  | "UNAVAILABLE";

export type DailyCalorieEntry = {
  id: string;
  loggedOn: string;
  caloriesConsumed: number;
  caloriesBurned: number | null;
  effectiveCaloriesBurned: number | null;
  caloriesBurnedSource: CaloriesBurnedSource;
  calculation: EnergyCalculation;
  balanceKcal: number | null;
  createdAt: string;
  updatedAt: string;
};

export type DailyCalorieSummary = {
  loggedDays: number;
  calculableDays: number;
  totalConsumedKcal: number;
  averageConsumedKcal: number | null;
  totalBurnedKcal: number | null;
  averageBurnedKcal: number | null;
  totalBalanceKcal: number | null;
};

export type DailyCaloriesResult = {
  entries: DailyCalorieEntry[];
  summary: DailyCalorieSummary;
};
