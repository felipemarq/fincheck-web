import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { mutationKeys } from "@/app/config/MutationKeys";
import { authService } from "@/app/services/authService";
import { treatAxiosError } from "@/app/utils/treatAxiosError";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().email("Informe um e-mail valido."),
  confirmationCode: z.string().trim().min(4, "Informe o codigo recebido."),
});

type FormData = z.infer<typeof schema>;

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedReturnTo = searchParams.get("returnTo");
  const returnTo =
    requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//")
      ? requestedReturnTo
      : "/";
  const {
    handleSubmit,
    register,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: searchParams.get("email") ?? "" },
  });

  const confirmMutation = useMutation({
    mutationKey: [mutationKeys.CONFIRM_SIGNUP],
    mutationFn: authService.confirmSignUp,
  });
  const resendMutation = useMutation({
    mutationKey: [mutationKeys.RESEND_SIGNUP_CODE],
    mutationFn: authService.resendSignUpCode,
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      await confirmMutation.mutateAsync(data);
      toast.success("E-mail confirmado. Agora voce pode entrar.");
      navigate("/login", { replace: true, state: { returnTo } });
    } catch (error) {
      treatAxiosError(error);
    }
  });

  const resend = async () => {
    const email = getValues("email");
    if (!schema.shape.email.safeParse(email).success) {
      toast.error("Informe um e-mail valido para reenviar o codigo.");
      return;
    }

    try {
      await resendMutation.mutateAsync(email);
      toast.success("Novo codigo enviado.");
    } catch (error) {
      treatAxiosError(error);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Confirme seu e-mail</CardTitle>
          <CardDescription>
            Digite o codigo enviado para ativar sua conta com seguranca.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="verification-email">E-mail</Label>
              <Input
                id="verification-email"
                type="email"
                error={errors.email?.message}
                {...register("email")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="verification-code">Codigo de confirmacao</Label>
              <Input
                id="verification-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                className="text-center text-lg tracking-[0.35em]"
                error={errors.confirmationCode?.message}
                {...register("confirmationCode")}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              isLoading={confirmMutation.isPending}
            >
              Confirmar e-mail
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={resend}
              isLoading={resendMutation.isPending}
            >
              Reenviar codigo
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Ja confirmou?{" "}
              <Link to="/login" state={{ returnTo }} className="underline">
                Entrar na conta
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
