import { httpClient } from "../httpClient";

export const confirmSignUp = async (input: {
  email: string;
  confirmationCode: string;
}) => {
  await httpClient.post("/auth/sign-up/confirm", input);
};
