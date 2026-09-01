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
import { Link } from "react-router-dom";

import { useForgotPassword } from "./useForgotPassword";

export default function ForgotPassword() {
  const { errors, handleSubmit, isLoading, register } = useForgotPassword();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <PlatformBrand className="self-center" />
        <div className={cn("flex flex-col gap-6")}>
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Recuperar senha</CardTitle>
              <CardDescription>
                Informe o seu e-mail para receber o código de recuperação.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-6">
                  <div className="grid gap-3">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      type="email"
                      placeholder="voce@empresa.com"
                      {...register("email")}
                      error={errors.email?.message}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Enviando..." : "Enviar código"}
                  </Button>

                  <div className="text-center text-sm">
                    Lembrou sua senha?{" "}
                    <Link to="/login" className="underline underline-offset-4">
                      Voltar para o login
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
