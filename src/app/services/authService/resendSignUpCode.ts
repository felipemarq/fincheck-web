import { httpClient } from "../httpClient";

export const resendSignUpCode = async (email: string) => {
  await httpClient.post("/auth/sign-up/resend", { email });
};
