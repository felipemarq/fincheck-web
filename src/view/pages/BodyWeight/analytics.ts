import type { BodyWeightEntry } from "@/app/entities/BodyWeightEntry";
import { format, parseISO, subDays } from "date-fns";

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

function average(entries: BodyWeightEntry[]): number | null {
  if (entries.length === 0) return null;
  return entries.reduce((sum, entry) => sum + entry.weightKg, 0) / entries.length;
}

export function calculateMovingAverage(
  entries: BodyWeightEntry[],
  windowDays = 7
): MovingAveragePoint[] {
  return entries.map((entry) => {
    const from = format(
      subDays(parseISO(entry.measuredOn), windowDays - 1),
      "yyyy-MM-dd"
    );
    const window = entries.filter(
      (candidate) =>
        candidate.measuredOn >= from && candidate.measuredOn <= entry.measuredOn
    );

    return {
      ...entry,
      movingAverageKg: average(window) ?? entry.weightKg,
    };
  });
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
