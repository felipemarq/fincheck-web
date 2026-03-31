import { httpClient } from "../httpClient";

export interface ForgotPasswordParams {
  email: string;
}

export const forgotPassword = async (params: ForgotPasswordParams) => {
  await httpClient.post("/auth/forgot-password", params);
};
