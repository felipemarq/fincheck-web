import type { PersonalHealthProfileResult } from "@/app/entities/PersonalHealth";
import { httpClient } from "../httpClient";

export async function get(onDate: string) {
  const { data } = await httpClient.get<PersonalHealthProfileResult>(
    "/me/health-profile",
    { params: { onDate } }
  );

  return data;
}
