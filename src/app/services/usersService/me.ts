import type { User } from "@/app/entities/User";
import { httpClient } from "../httpClient";

type MeResponse = User;

export const me = async () => {
  const { data } = await httpClient.get<MeResponse>("/me");
  return data; // <- já retorna o User direto
};
