import { confirmForgotPassword } from "./confirmForgotPassword";
import { forgotPassword } from "./forgotPassword";
import { signIn } from "./signIn";
import { signUp } from "./signUp";
import { confirmSignUp } from "./confirmSignUp";
import { resendSignUpCode } from "./resendSignUpCode";

export const authService = {
  confirmForgotPassword,
  forgotPassword,
  signIn,
  signUp,
  confirmSignUp,
  resendSignUpCode,
};
