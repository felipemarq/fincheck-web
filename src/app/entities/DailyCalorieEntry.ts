import type { EnergyCalculation } from "./PersonalHealth";

export type DailyCalorieEntry = {
  id: string;
  loggedOn: string;
  caloriesConsumed: number;
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
  totalBalanceKcal: number | null;
};

export type DailyCaloriesResult = {
  entries: DailyCalorieEntry[];
  summary: DailyCalorieSummary;
};
