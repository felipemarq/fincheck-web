import type { BodyWeightEntry } from "@/app/entities/BodyWeightEntry";
import { httpClient } from "../httpClient";

export type GetBodyWeightsParams = {
  from?: string;
  to?: string;
};

export async function getAll(params: GetBodyWeightsParams = {}) {
  const { data } = await httpClient.get<{ entries: BodyWeightEntry[] }>(
    "/me/body-weights",
    { params }
  );

  return data.entries;
}
