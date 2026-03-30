import { useMemo, useState } from "react";
import { IconCreditCard, IconPlus } from "@tabler/icons-react";

import { useAuth } from "@/app/hooks/useAuth";
import { useAccounts } from "@/app/hooks/useAccounts";
import { useCreditCards } from "@/app/hooks/useCreditCards";
import type { CreditCard } from "@/app/entities/CreditCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreditCardModal } from "@/view/modals/CreditCardModal";

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function CreditCards() {
  const { selectedEntityId } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [cardBeingEdited, setCardBeingEdited] =
    useState<CreditCard.Attributes | null>(null);

  const { creditCards, isFetchingCreditCards } = useCreditCards(
    {
      entityId: selectedEntityId!,
    },
    Boolean(selectedEntityId)
  );

  const { accounts } = useAccounts(
    {
      entityId: selectedEntityId!,
    },
    Boolean(selectedEntityId)
  );

  const accountMap = useMemo(() => {
    const map = new Map<string, string>();
    accounts?.forEach((account) => {
      if (account.id) {
        map.set(account.id, account.name);
      }
    });
    return map;
  }, [accounts]);

  const totalLimit =
    creditCards?.reduce((sum, card) => sum + Number(card.creditLimit), 0) ?? 0;

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-3 px-4 lg:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cartões</h1>
          <p className="text-muted-foreground text-sm">
            Cadastre os cartões da entidade ativa e mantenha regras básicas de
            fechamento e vencimento organizadas.
          </p>
        </div>
        <Button
          className="w-full md:w-auto"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <IconPlus className="mr-2 size-4" />
          Novo cartão
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
            <CardDescription>Visão rápida da entidade atual.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total de cartões</span>
              <strong>{creditCards?.length ?? 0}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Limite somado</span>
              <strong>{formatMoney(totalLimit)}</strong>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 xl:col-span-2 md:grid-cols-2">
          {isFetchingCreditCards && (
            <Card className="md:col-span-2">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                Carregando cartões...
              </CardContent>
            </Card>
          )}

          {!isFetchingCreditCards && (creditCards?.length ?? 0) === 0 && (
            <Card className="md:col-span-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <IconCreditCard className="size-10 text-muted-foreground" />
                <div>
                  <p className="font-medium">Nenhum cartão cadastrado</p>
                  <p className="text-muted-foreground text-sm">
                    Comece adicionando o primeiro cartão da entidade ativa.
                  </p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <IconPlus className="mr-2 size-4" />
                  Criar cartão
                </Button>
              </CardContent>
            </Card>
          )}

          {creditCards?.map((card) => (
            <Card
              key={card.id}
              className="overflow-hidden border-0 shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${card.color ?? "#0f766e"} 0%, #111827 100%)`,
              }}
            >
              <CardHeader className="text-white">
                <CardDescription className="text-white/70">
                  {accountMap.get(card.accountId ?? "") ?? "Sem conta vinculada"}
                </CardDescription>
                <CardTitle className="text-xl">{card.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-white">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/60">
                    Limite
                  </p>
                  <p className="text-2xl font-semibold">
                    {formatMoney(Number(card.creditLimit))}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-white/10 p-3">
                    <p className="text-white/60">Fechamento</p>
                    <strong>Dia {card.closingDay}</strong>
                  </div>
                  <div className="rounded-lg bg-white/10 p-3">
                    <p className="text-white/60">Vencimento</p>
                    <strong>Dia {card.dueDay}</strong>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setCardBeingEdited(card)}
                >
                  Editar cartão
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <CreditCardModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        action="create"
      />

      <CreditCardModal
        isOpen={Boolean(cardBeingEdited)}
        onClose={() => setCardBeingEdited(null)}
        action="update"
        creditCard={cardBeingEdited}
      />
    </div>
  );
}
