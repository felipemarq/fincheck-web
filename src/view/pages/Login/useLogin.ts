import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";

import { authService } from "@/app/services/authService";
import { useAuth } from "@/app/hooks/useAuth";

import { mutationKeys } from "@/app/config/MutationKeys";

import { treatAxiosError } from "@/app/utils/treatAxiosError";
import type { SigninParams } from "@/app/services/authService/signIn";

const schema = z.object({
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

export const useLogin = () => {
  const { signin } = useAuth();
  const {
    handleSubmit: hookFormHandleSubmit,
    register,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { isPending: isLoading, mutateAsync } = useMutation({
    mutationKey: [mutationKeys.SIGNIN],
    mutationFn: async (data: SigninParams) => {
      return authService.signIn(data);
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
