import { httpClient } from "../httpClient";

export async function remove(measuredOn: string) {
  await httpClient.delete(`/me/body-weights/${measuredOn}`);
}
