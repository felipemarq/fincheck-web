import { httpClient } from "../httpClient";

export interface SignUpParams {
  email: string;
  password: string;
  name: string;
}

interface SignUpResponse {
  accessToken: string;
  refreshToken: string;
}

export const signUp = async (params: SignUpParams) => {
  const { data } = await httpClient.post<SignUpResponse>(
    "/auth/sign-up",
    params
  );
  return data;
};
