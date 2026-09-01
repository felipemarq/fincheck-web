import type { BodyWeightEntry } from "@/app/entities/BodyWeightEntry";
import type { DailyCalorieEntry } from "@/app/entities/DailyCalorieEntry";
import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  subDays,
} from "date-fns";

export type MovingAveragePoint = BodyWeightEntry & {
  movingAverageKg: number;
};

export type PeriodComparison = {
  currentAverageKg: number | null;
  previousAverageKg: number | null;
  deltaKg: number | null;
  currentCount: number;
  previousCount: number;
};

export type WeeklyHealthSummary = {
  from: string;
  to: string;
  averageWeightKg: number | null;
  weightEntries: number;
  totalConsumedKcal: number;
  averageConsumedKcal: number | null;
  averageBurnedKcal: number | null;
  calorieDays: number;
  totalBalanceKcal: number | null;
  calculableDays: number;
};

export type GoalProjectionStatus =
  | "NO_GOAL"
  | "INSUFFICIENT_DATA"
  | "GOAL_REACHED"
  | "NOT_TOWARD_GOAL"
  | "PROJECTED";

export type GoalProjection = {
  status: GoalProjectionStatus;
  currentTrendWeightKg: number | null;
  weeklyRateKg: number | null;
  projectedDate: string | null;
  daysToGoal: number | null;
  sampleCount: number;
  sampleSpanDays: number;
  targetDateStatus: "ON_TRACK" | "AFTER_TARGET" | null;
};

function average(entries: BodyWeightEntry[]): number | null {
  if (entries.length === 0) return null;
  return entries.reduce((sum, entry) => sum + entry.weightKg, 0) / entries.length;
}

export function calculateMovingAverage(
  entries: BodyWeightEntry[],
  windowDays = 7
): MovingAveragePoint[] {
  const orderedEntries = [...entries].sort((left, right) =>
    left.measuredOn.localeCompare(right.measuredOn)
  );

  return orderedEntries.map((entry) => {
    const from = format(
      subDays(parseISO(entry.measuredOn), windowDays - 1),
      "yyyy-MM-dd"
    );
    const window = orderedEntries.filter(
      (candidate) =>
        candidate.measuredOn >= from && candidate.measuredOn <= entry.measuredOn
    );

    return {
      ...entry,
      movingAverageKg: average(window) ?? entry.weightKg,
    };
  });
}

export function summarizeHealthWeek(
  weightEntries: BodyWeightEntry[],
  calorieEntries: DailyCalorieEntry[],
  endDate: string
): WeeklyHealthSummary {
  const from = format(subDays(parseISO(endDate), 6), "yyyy-MM-dd");
  const currentWeights = weightEntries.filter(
    (entry) => entry.measuredOn >= from && entry.measuredOn <= endDate
  );
  const currentCalories = calorieEntries.filter(
    (entry) => entry.loggedOn >= from && entry.loggedOn <= endDate
  );
  const calculableCalories = currentCalories.filter(
    (entry) => entry.balanceKcal !== null
  );
  const totalConsumedKcal = currentCalories.reduce(
    (sum, entry) => sum + entry.caloriesConsumed,
    0
  );

  return {
    from,
    to: endDate,
    averageWeightKg: average(currentWeights),
    weightEntries: currentWeights.length,
    totalConsumedKcal,
    averageConsumedKcal:
      currentCalories.length === 0
        ? null
        : totalConsumedKcal / currentCalories.length,
    calorieDays: currentCalories.length,
    averageBurnedKcal:
      calculableCalories.length === 0
        ? null
        : calculableCalories.reduce(
            (sum, entry) => sum + (entry.effectiveCaloriesBurned ?? 0),
            0
          ) / calculableCalories.length,
    totalBalanceKcal:
      calculableCalories.length === 0
        ? null
        : calculableCalories.reduce(
            (sum, entry) => sum + (entry.balanceKcal ?? 0),
            0
          ),
    calculableDays: calculableCalories.length,
  };
}

export function calculateGoalProjection({
  entries,
  targetWeightKg,
  targetDate,
  endDate,
}: {
  entries: BodyWeightEntry[];
  targetWeightKg: number | null;
  targetDate: string | null;
  endDate: string;
}): GoalProjection {
  const base: GoalProjection = {
    status: targetWeightKg === null ? "NO_GOAL" : "INSUFFICIENT_DATA",
    currentTrendWeightKg: null,
    weeklyRateKg: null,
    projectedDate: null,
    daysToGoal: null,
    sampleCount: 0,
    sampleSpanDays: 0,
    targetDateStatus: null,
  };

  if (targetWeightKg === null) return base;

  const points = calculateMovingAverage(
    entries.filter((entry) => entry.measuredOn <= endDate)
  );
  const latest = points.at(-1);
  if (!latest) return base;

  const currentTrendWeightKg = latest.movingAverageKg;
  const remainingKg = targetWeightKg - currentTrendWeightKg;
  if (Math.abs(remainingKg) < 0.05) {
    return {
      ...base,
      status: "GOAL_REACHED",
      currentTrendWeightKg,
    };
  }

  const latestAgeDays = differenceInCalendarDays(
    parseISO(endDate),
    parseISO(latest.measuredOn)
  );
  const trendFrom = format(
    subDays(parseISO(latest.measuredOn), 41),
    "yyyy-MM-dd"
  );
  const samples = points.filter((point) => point.measuredOn >= trendFrom);
  const sampleSpanDays =
    samples.length < 2
      ? 0
      : differenceInCalendarDays(
          parseISO(samples.at(-1)!.measuredOn),
          parseISO(samples[0].measuredOn)
        );

  const withSample = {
    ...base,
    currentTrendWeightKg,
    sampleCount: samples.length,
    sampleSpanDays,
  };
  if (samples.length < 4 || sampleSpanDays < 14 || latestAgeDays > 7) {
    return withSample;
  }

  const origin = parseISO(samples[0].measuredOn);
  const coordinates = samples.map((sample) => ({
    x: differenceInCalendarDays(parseISO(sample.measuredOn), origin),
    y: sample.movingAverageKg,
  }));
  const meanX = coordinates.reduce((sum, point) => sum + point.x, 0) /
    coordinates.length;
  const meanY = coordinates.reduce((sum, point) => sum + point.y, 0) /
    coordinates.length;
  const denominator = coordinates.reduce(
    (sum, point) => sum + (point.x - meanX) ** 2,
    0
  );
  if (denominator === 0) return withSample;

  const slopeKgPerDay =
    coordinates.reduce(
      (sum, point) => sum + (point.x - meanX) * (point.y - meanY),
      0
    ) / denominator;
  const weeklyRateKg = slopeKgPerDay * 7;
  const movingTowardGoal =
    remainingKg * slopeKgPerDay > 0 && Math.abs(weeklyRateKg) >= 0.05;
  if (!movingTowardGoal) {
    return {
      ...withSample,
      status: "NOT_TOWARD_GOAL",
      weeklyRateKg,
    };
  }

  const daysToGoal = Math.ceil(remainingKg / slopeKgPerDay);
  if (!Number.isFinite(daysToGoal) || daysToGoal <= 0 || daysToGoal > 730) {
    return {
      ...withSample,
      status: "NOT_TOWARD_GOAL",
      weeklyRateKg,
    };
  }

  const projectedDate = format(
    addDays(parseISO(latest.measuredOn), daysToGoal),
    "yyyy-MM-dd"
  );

  return {
    ...withSample,
    status: "PROJECTED",
    weeklyRateKg,
    projectedDate,
    daysToGoal,
    targetDateStatus: targetDate
      ? projectedDate <= targetDate
        ? "ON_TRACK"
        : "AFTER_TARGET"
      : null,
  };
}

export function comparePeriods(
  entries: BodyWeightEntry[],
  days: number,
  endDate: string
): PeriodComparison {
  const end = parseISO(endDate);
  const currentFrom = format(subDays(end, days - 1), "yyyy-MM-dd");
  const previousTo = format(subDays(end, days), "yyyy-MM-dd");
  const previousFrom = format(subDays(end, days * 2 - 1), "yyyy-MM-dd");
  const current = entries.filter(
    (entry) => entry.measuredOn >= currentFrom && entry.measuredOn <= endDate
  );
  const previous = entries.filter(
    (entry) =>
      entry.measuredOn >= previousFrom && entry.measuredOn <= previousTo
  );
  const currentAverageKg = average(current);
  const previousAverageKg = average(previous);

  return {
    currentAverageKg,
    previousAverageKg,
    deltaKg:
      currentAverageKg === null || previousAverageKg === null
        ? null
        : currentAverageKg - previousAverageKg,
    currentCount: current.length,
    previousCount: previous.length,
  };
}
