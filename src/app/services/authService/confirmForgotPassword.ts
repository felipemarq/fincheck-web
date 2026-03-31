import { httpClient } from "../httpClient";

export interface ConfirmForgotPasswordParams {
  email: string;
  confirmationCode: string;
  password: string;
}

export const confirmForgotPassword = async (
  params: ConfirmForgotPasswordParams
) => {
  await httpClient.post("/auth/forgot-password/confirm", params);
};
