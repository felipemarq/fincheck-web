import { PlatformBrand } from "@/components/PlatformBrand";
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
import { cn } from "@/lib/utils";
import { Link, useSearchParams } from "react-router-dom";

import { useResetPassword } from "./useResetPassword";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get("email") ?? undefined;
  const { errors, handleSubmit, isLoading, register } =
    useResetPassword(initialEmail);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <PlatformBrand className="self-center" />
        <div className={cn("flex flex-col gap-6")}>
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Definir nova senha</CardTitle>
              <CardDescription>
                Digite o código recebido no e-mail e escolha sua nova senha.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4">
                  <div className="grid gap-3">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      type="email"
                      placeholder="voce@empresa.com"
                      {...register("email")}
                      error={errors.email?.message}
                    />
                  </div>

                  <div className="grid gap-3">
                    <Label htmlFor="confirmationCode">Código</Label>
                    <Input
                      type="text"
                      placeholder="Código de recuperação"
                      {...register("confirmationCode")}
                      error={errors.confirmationCode?.message}
                    />
                  </div>

                  <div className="grid gap-3">
                    <Label htmlFor="password">Nova senha</Label>
                    <Input
                      type="password"
                      placeholder="Nova senha"
                      {...register("password")}
                      error={errors.password?.message}
                    />
                  </div>

                  <div className="grid gap-3">
                    <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                    <Input
                      type="password"
                      placeholder="Confirme a nova senha"
                      {...register("confirmPassword")}
                      error={errors.confirmPassword?.message}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Atualizando..." : "Atualizar senha"}
                  </Button>

                  <div className="text-center text-sm">
                    Não recebeu o código?{" "}
                    <Link
                      to="/forgot-password"
                      className="underline underline-offset-4"
                    >
                      Enviar novamente
                    </Link>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
