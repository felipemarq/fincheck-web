import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";

import { authService } from "@/app/services/authService";
import { mutationKeys } from "@/app/config/MutationKeys";

import { treatAxiosError } from "@/app/utils/treatAxiosError";
import type { SignUpParams } from "@/app/services/authService/signUp";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
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
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = location.state as { returnTo?: string } | null;
  const requestedReturnTo = searchParams.get("returnTo") ?? state?.returnTo;
  const returnTo =
    requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//")
      ? requestedReturnTo
      : "/";
  const {
    handleSubmit: hookFormHandleSubmit,
    register,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: searchParams.get("email") ?? "",
    },
  });

  const { isPending: isLoading, mutateAsync } = useMutation({
    mutationKey: [mutationKeys.SIGNUP],
    mutationFn: async (data: SignUpParams) => {
      return authService.signUp(data);
    },
  });

  const handleSubmit = hookFormHandleSubmit(async (data) => {
    try {
      const result = await mutateAsync(data);
      const params = new URLSearchParams({
        email: result.email,
        returnTo,
      });
      navigate(`/verify-email?${params.toString()}`, { replace: true });
    } catch (error) {
      treatAxiosError(error);
    }
  });

  return { handleSubmit, register, errors, isLoading };
};
