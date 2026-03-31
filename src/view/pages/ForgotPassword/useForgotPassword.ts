import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useNavigate } from "react-router-dom";

import { mutationKeys } from "@/app/config/MutationKeys";
import { authService } from "@/app/services/authService";
import type { ForgotPasswordParams } from "@/app/services/authService/forgotPassword";
import { treatAxiosError } from "@/app/utils/treatAxiosError";

const schema = z.object({
  email: z
    .string()
    .min(1, "E-mail é obrigatório.")
    .email("Informe um e-mail válido."),
});

type FormData = z.infer<typeof schema>;

export const useForgotPassword = () => {
  const navigate = useNavigate();

  const {
    handleSubmit: hookFormHandleSubmit,
    register,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { isPending: isLoading, mutateAsync } = useMutation({
    mutationKey: [mutationKeys.FORGOT_PASSWORD],
    mutationFn: async (data: ForgotPasswordParams) => {
      return authService.forgotPassword(data);
    },
  });

  const handleSubmit = hookFormHandleSubmit(async (data) => {
    try {
      await mutateAsync(data);
      toast("Enviamos o código de recuperação para o seu e-mail.");
      navigate(`/reset-password?email=${encodeURIComponent(data.email)}`);
    } catch (error) {
      treatAxiosError(error);
    }
  });

  return { errors, handleSubmit, isLoading, register };
};
