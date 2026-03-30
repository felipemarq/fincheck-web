import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";

import { authService } from "@/app/services/authService";
import { useAuth } from "@/app/hooks/useAuth";

import { mutationKeys } from "@/app/config/MutationKeys";

import { treatAxiosError } from "@/app/utils/treatAxiosError";
import type { SignUpParams } from "@/app/services/authService/signUp";
const schema = z.object({
  name: z
    .string()
    .nonempty("Nome é obrigatório")
    .min(2, "Nome deve conter pelo menos 2 dígitos."),
  email: z
    .string()
    .min(1, "E-mail é obrigatório.")
    .email("Informe um E-mail válido."),
  password: z
    .string()
    .nonempty("Senha é obrigatório")
    .min(8, "Senha deve conter pelo menos 8 dígitos."),
});

type FormData = z.infer<typeof schema>;

export const useRegister = () => {
  const { signin } = useAuth();
  const {
    handleSubmit: hookFormHandleSubmit,
    register,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { isPending: isLoading, mutateAsync } = useMutation({
    mutationKey: [mutationKeys.SIGNUP],
    mutationFn: async (data: SignUpParams) => {
      return authService.signUp(data);
    },
  });

  const handleSubmit = hookFormHandleSubmit(async (data) => {
    try {
      const session = await mutateAsync(data);
      signin(session);
    } catch (error) {
      treatAxiosError(error);
    }
  });

  return { handleSubmit, register, errors, isLoading };
};
