import { IconArrowRight, IconBuildingBank, IconCircleCheck } from "@tabler/icons-react";
import { Link } from "react-router-dom";

import type { Entity } from "@/app/entities/Entity";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ENTITY_TYPE_LABELS: Record<Entity["type"], string> = {
  PF: "Pessoa fisica",
  PJ: "Pessoa juridica",
};

interface EntityOnboardingBannerProps {
  activeEntity: Entity;
  hasAccounts: boolean;
  isFirstTransactionRecommended: boolean;
  onCreateAccount: () => void;
  onCreateTransaction: () => void;
}

export function EntityOnboardingBanner({
  activeEntity,
  hasAccounts,
  isFirstTransactionRecommended,
  onCreateAccount,
  onCreateTransaction,
}: EntityOnboardingBannerProps) {
  if (hasAccounts && !isFirstTransactionRecommended) {
    return null;
  }

  const isAccountStep = !hasAccounts;

  return (
    <div className="px-4 lg:px-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-primary">
            <span className="inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: activeEntity.color }}
              />
              Entidade ativa
            </span>
            <span>{ENTITY_TYPE_LABELS[activeEntity.type]}</span>
          </div>
          <div>
            <CardTitle className="text-2xl">
              {isAccountStep
                ? `Configure a primeira conta de ${activeEntity.name}`
                : `Tudo pronto em ${activeEntity.name}. Falta registrar a primeira transacao.`}
            </CardTitle>
            <CardDescription className="mt-1 text-sm">
              {isAccountStep
                ? "Cada entidade opera separadamente. O primeiro passo agora e cadastrar a conta que vai receber movimentacoes, cartoes e recorrencias."
                : "Sua entidade ja tem conta cadastrada. Agora vale registrar a primeira receita ou despesa para iniciar o dashboard financeiro."}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
            <div className="rounded-lg bg-background/80 p-3">
              <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                <IconCircleCheck className="size-4 text-primary" />
                Passo 1
              </div>
              Crie ou confirme a entidade que separa o contexto PF/PJ.
            </div>
            <div className="rounded-lg bg-background/80 p-3">
              <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                <IconCircleCheck
                  className={cn(
                    "size-4",
                    hasAccounts ? "text-primary" : "text-muted-foreground"
                  )}
                />
                Passo 2
              </div>
              Cadastre a primeira conta financeira da entidade.
            </div>
            <div className="rounded-lg bg-background/80 p-3">
              <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                <IconCircleCheck
                  className={cn(
                    "size-4",
                    !isAccountStep && isFirstTransactionRecommended
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                />
                Passo 3
              </div>
              Lance a primeira transacao para alimentar o dashboard.
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {isAccountStep ? (
              <>
                <Button onClick={onCreateAccount} className="sm:w-auto">
                  <IconBuildingBank className="size-4" />
                  Criar primeira conta
                </Button>
                <Link
                  to="/accounts"
                  className={cn(buttonVariants({ variant: "outline" }), "sm:w-auto")}
                >
                  Ir para contas
                </Link>
              </>
            ) : (
              <>
                <Button onClick={onCreateTransaction} className="sm:w-auto">
                  <IconArrowRight className="size-4" />
                  Registrar primeira transacao
                </Button>
                <Link
                  to="/accounts"
                  className={cn(buttonVariants({ variant: "outline" }), "sm:w-auto")}
                >
                  Revisar contas da entidade
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
