import { httpClient } from "../httpClient";

export interface SigninParams {
  email: string;
  password: string;
}

interface SigninResponse {
  accessToken: string;
  refreshToken: string;
}

export const signIn = async (params: SigninParams) => {
  const { data } = await httpClient.post<SigninResponse>(
    "/auth/sign-in",
    params
  );
  return data;
};
