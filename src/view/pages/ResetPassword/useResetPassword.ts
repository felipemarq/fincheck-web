import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { mutationKeys } from "@/app/config/MutationKeys";
import { authService } from "@/app/services/authService";
import type { ConfirmForgotPasswordParams } from "@/app/services/authService/confirmForgotPassword";
import { treatAxiosError } from "@/app/utils/treatAxiosError";

const schema = z
  .object({
    email: z
      .string()
      .min(1, "E-mail é obrigatório.")
      .email("Informe um e-mail válido."),
    confirmationCode: z.string().min(1, "Código é obrigatório."),
    password: z
      .string()
      .min(8, "Senha deve conter pelo menos 8 caracteres."),
    confirmPassword: z.string().min(8, "Confirme a nova senha."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas precisam ser iguais.",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export const useResetPassword = (initialEmail?: string) => {
  const navigate = useNavigate();

  const {
    handleSubmit: hookFormHandleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      confirmationCode: "",
      confirmPassword: "",
      email: initialEmail ?? "",
      password: "",
    },
  });

  useEffect(() => {
    if (!initialEmail) {
      return;
    }

    reset((currentValues) => ({
      ...currentValues,
      email: initialEmail,
    }));
  }, [initialEmail, reset]);

  const { isPending: isLoading, mutateAsync } = useMutation({
    mutationKey: [mutationKeys.CONFIRM_FORGOT_PASSWORD],
    mutationFn: async (data: ConfirmForgotPasswordParams) => {
      return authService.confirmForgotPassword(data);
    },
  });

  const handleSubmit = hookFormHandleSubmit(async (data) => {
    try {
      await mutateAsync({
        confirmationCode: data.confirmationCode,
        email: data.email,
        password: data.password,
      });
      toast("Senha redefinida com sucesso. Faça login para continuar.");
      navigate("/login");
    } catch (error) {
      treatAxiosError(error);
    }
  });

  return { errors, handleSubmit, isLoading, register };
};
