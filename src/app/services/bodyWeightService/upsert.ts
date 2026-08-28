import type { BodyWeightEntry } from "@/app/entities/BodyWeightEntry";
import { httpClient } from "../httpClient";

export type UpsertBodyWeightParams = {
  measuredOn: string;
  weightKg: number;
};

export async function upsert({
  measuredOn,
  weightKg,
}: UpsertBodyWeightParams) {
  const { data } = await httpClient.put<{ entry: BodyWeightEntry }>(
    `/me/body-weights/${measuredOn}`,
    { weightKg }
  );

  return data.entry;
}
