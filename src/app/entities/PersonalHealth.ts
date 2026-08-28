export type CalculationSex = "MALE" | "FEMALE";

export type ActivityLevel =
  | "SEDENTARY_LIGHT"
  | "ACTIVE_MODERATE"
  | "VIGOROUS";

export type EnergyCalculationSource =
  | "OVERRIDE"
  | "ESTIMATE"
  | "UNAVAILABLE";

export type PersonalHealthProfile = {
  targetWeightKg: number | null;
  targetDate: string | null;
  heightCm: number | null;
  birthDate: string | null;
  calculationSex: CalculationSex | null;
  activityLevel: ActivityLevel | null;
  dailyExpenditureOverrideKcal: number | null;
  createdAt: string;
  updatedAt: string;
};

export type EnergyCalculation = {
  onDate: string;
  weightKg: number | null;
  weightMeasuredOn: string | null;
  ageYears: number | null;
  restingEnergyExpenditureKcal: number | null;
  activityFactor: number | null;
  estimatedDailyExpenditureKcal: number | null;
  effectiveDailyExpenditureKcal: number | null;
  source: EnergyCalculationSource;
};

export type PersonalHealthProfileResult = {
  profile: PersonalHealthProfile | null;
  calculation: EnergyCalculation;
};
