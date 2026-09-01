import { httpClient } from "../httpClient";

export interface SignUpParams {
  email: string;
  password: string;
  name: string;
}

interface SignUpResponse {
  email: string;
  requiresConfirmation: true;
}

export const signUp = async (params: SignUpParams) => {
  const { data } = await httpClient.post<SignUpResponse>(
    "/auth/sign-up",
    params
  );
  return data;
};
