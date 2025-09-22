import { AxiosError } from "axios";
import { toast } from "sonner";

export const treatAxiosError = (error: Error | typeof AxiosError) => {
  console.log(error);
  if (error instanceof AxiosError) {
    if (error.response) {
      toast(error.response.data?.error?.message);
    } else {
      toast("Ocorreu um erro!");
    }

    return;
  }
};
