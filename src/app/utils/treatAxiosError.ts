import { AxiosError } from "axios";
import { toast } from "sonner";

export const treatAxiosError = (error: Error | typeof AxiosError) => {
  if (error instanceof AxiosError) {
    if (error.response) {
      toast(error.response.data.message);
    } else {
      toast("Ocorreu um erro!");
    }

    return;
  }
};
