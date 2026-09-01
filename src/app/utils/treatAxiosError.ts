import { AxiosError } from "axios";
import { toast } from "sonner";

export const treatAxiosError = (error: unknown) => {
  if (error instanceof AxiosError) {
    if (error.response) {
      const errMsg = error.response.data?.error?.message;

      if (Array.isArray(errMsg)) {
        // Se for array, junta as mensagens
        const msgs = errMsg.map((m: any) => m.message).join("\n");
        toast(msgs);
      } else {
        // Se for string (ou algo parecido), mostra direto
        toast(errMsg || "Ocorreu um erro!");
      }
    } else {
      toast("Ocorreu um erro!");
    }
    return;
  }

  if (error instanceof Error) {
    toast(error.message || "Ocorreu um erro!");
    return;
  }

  toast("Ocorreu um erro!");
};
