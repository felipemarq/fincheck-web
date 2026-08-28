import { httpClient } from "../httpClient";

export async function remove(loggedOn: string) {
  await httpClient.delete(`/me/daily-calories/${loggedOn}`);
}
