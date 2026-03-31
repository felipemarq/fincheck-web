import wordmark from "@/assets/moneystack_wordmark.png";
import icon from "@/assets/moneystack_maskable_512.png";
import { cn } from "@/lib/utils";
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
import { Link } from "react-router-dom";
import { useRegister } from "./useRegister";

export default function Register() {
  const { handleSubmit, register, errors, isLoading } = useRegister();
  return (
    <div className=" flex flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <img src={icon} alt="icon" className="h-6 w-6 rounded-md" />
          </div>
          <img src={wordmark} alt="wordmark" className="h-8 " />
        </div>
        <div className={cn("flex flex-col gap-6")}>
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Seja Bem vindo</CardTitle>
              <CardDescription>Crie a sua conta</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-6">
                  <div className="grid gap-6">
                    <div className="grid gap-3">
                      <Label htmlFor="email">Nome</Label>
                      <Input
                        type="text"
                        placeholder="Nome"
                        {...register("name")}
                        error={errors.name?.message}
                      />
                    </div>
                    <div className="grid gap-3">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        type="email"
                        placeholder="E-mail"
                        {...register("email")}
                        error={errors.email?.message}
                      />
                    </div>
                    <div className="grid gap-3">
                      <div className="flex items-center">
                        <Label htmlFor="password">Senha</Label>
                        <Link
                          to="/forgot-password"
                          className="ml-auto text-sm underline-offset-4 hover:underline"
                        >
                          Esqueceu sua senha?
                        </Link>
                      </div>
                      <Input
                        type="password"
                        placeholder="Senha"
                        {...register("password")}
                        error={errors.password?.message}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      Registrar
                    </Button>
                  </div>
                  <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                    <span className="bg-card text-muted-foreground relative z-10 px-2">
                      Ou crie usando a sua conta Google (em breve)
                    </span>
                  </div>
                  <div className="flex flex-col gap-4 cursor-not-allowed">
                    <Button variant="outline" className="w-full " disabled>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                          fill="currentColor"
                        />
                      </svg>
                      Criar conta com Google
                    </Button>
                  </div>
                  <div className="text-center text-sm">
                    Já possui uma conta?{" "}
                    <Link to="/login" className="underline underline-offset-4">
                      Faça o login aqui
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
