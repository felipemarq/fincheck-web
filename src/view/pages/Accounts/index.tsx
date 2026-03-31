import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  IconArrowRight,
  IconBuildingBank,
  IconPlus,
  IconTrash,
  IconWallet,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { QueryKeys } from "@/app/config/QueryKeys";
import { Account } from "@/app/entities/Account";
import { useAuth } from "@/app/hooks/useAuth";
import { useAccounts } from "@/app/hooks/useAccounts";
import { useDashboard } from "@/app/hooks/useDashboard";
import { accountService } from "@/app/services/accountService";
import { treatAxiosError } from "@/app/utils/treatAxiosError";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AccountModal } from "@/view/modals/AccountModal";
import { ACCOUNT_TYPE_LABELS_PT } from "@/view/i18n/pt/account";

const DEFAULT_ACCOUNT_COLOR = "#868E96";
const ENTITY_TYPE_LABELS = {
  PF: "Pessoa fisica",
  PJ: "Pessoa juridica",
} as const;

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function Accounts() {
  const navigate = useNavigate();
  const {
    activeEntity,
    selectedEntityId,
    entityOnboarding,
    advanceEntityOnboarding,
  } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [accountBeingEdited, setAccountBeingEdited] =
    useState<Account.Attributes | null>(null);

  const { accounts, isFetchingAccounts } = useAccounts(
    {
      entityId: selectedEntityId!,
    },
    Boolean(selectedEntityId)
  );

  const { dashboard } = useDashboard(
    {
      entityId: selectedEntityId!,
      sections: ["balances"],
    },
    Boolean(selectedEntityId)
  );

  const { isPending: isDeleting, mutateAsync: deleteAccount } = useMutation({
    mutationFn: accountService.remove,
  });

  const isCreateAccountOnboarding =
    entityOnboarding?.entityId === selectedEntityId &&
    entityOnboarding.step === "create-account";

  const balancesByAccountId = useMemo(() => {
    const map = new Map<string, number>();

    dashboard?.balances?.forEach((balance) => {
      if (balance.accountId) {
        map.set(balance.accountId, balance.balance);
      }
    });

    return map;
  }, [dashboard?.balances]);

  const summary = useMemo(() => {
    const totalAccounts = accounts?.length ?? 0;
    const totalInitialBalance =
      accounts?.reduce((sum, account) => sum + Number(account.initialBalance), 0) ??
      0;
    const totalCurrentBalance =
      dashboard?.balances?.reduce((sum, account) => sum + account.balance, 0) ?? 0;
    const byType = {
      checking:
        accounts?.filter((account) => account.type === Account.Type.CHECKING)
          .length ?? 0,
      investment:
        accounts?.filter((account) => account.type === Account.Type.INVESTMENT)
          .length ?? 0,
      cash:
        accounts?.filter((account) => account.type === Account.Type.CASH).length ?? 0,
    };

    return {
      totalAccounts,
      totalInitialBalance,
      totalCurrentBalance,
      byType,
    };
  }, [accounts, dashboard?.balances]);

  const handleDeleteAccount = async (account: Account.Attributes) => {
    if (!selectedEntityId || !account.id) {
      return;
    }

    const confirmed = window.confirm(
      `Deseja excluir a conta "${account.name}"? A exclusao so sera permitida se ela nao estiver vinculada a transacoes, recorrencias, compras parceladas ou cartoes.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteAccount({
        entityId: selectedEntityId,
        accountId: account.id,
      });

      toast.success("Conta removida com sucesso!");

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.ACCOUNTS, selectedEntityId],
        }),
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.DASHBOARD],
        }),
      ]);
    } catch (error) {
      treatAxiosError(error);
    }
  };

  const handleCreateAccountSuccess = async () => {
    if (!isCreateAccountOnboarding) {
      return;
    }

    advanceEntityOnboarding("first-transaction");
    toast("Primeira conta criada. Agora registre a primeira transacao da entidade.");
    navigate("/");
  };

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-3 px-4 lg:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contas</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie as contas operacionais da entidade ativa. Aqui entram contas
            bancarias, caixa fisico e contas de investimento usadas no dia a dia.
          </p>
        </div>
        <Button
          className="w-full md:w-auto"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <IconPlus className="mr-2 size-4" />
          Nova conta
        </Button>
      </div>

      {activeEntity && (
        <div className="px-4 lg:px-6">
          <Card className={cn(isCreateAccountOnboarding && "border-primary/20 bg-primary/5")}>
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
                <CardTitle>{activeEntity.name}</CardTitle>
                <CardDescription>
                  {isCreateAccountOnboarding
                    ? "Voce acabou de criar esta entidade. O proximo passo e cadastrar a primeira conta para comecar a operar nela."
                    : "As contas desta tela pertencem somente a esta entidade. Trocar a entidade ativa muda completamente os dados exibidos."}
                </CardDescription>
              </div>
            </CardHeader>
            {isCreateAccountOnboarding && (
              <CardContent className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <IconBuildingBank className="size-4" />
                  Criar primeira conta
                </Button>
                <button
                  type="button"
                  className={cn(buttonVariants({ variant: "outline" }))}
                  onClick={() => navigate("/")}
                >
                  <IconArrowRight className="size-4" />
                  Voltar ao dashboard
                </button>
              </CardContent>
            )}
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total de contas</CardDescription>
            <CardTitle>{summary.totalAccounts}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Estruturas financeiras disponiveis para a entidade ativa.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Saldo atual consolidado</CardDescription>
            <CardTitle>{formatMoney(summary.totalCurrentBalance)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Calculado com base no saldo inicial e nas transacoes pagas.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Saldo inicial somado</CardDescription>
            <CardTitle>{formatMoney(summary.totalInitialBalance)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Valor de partida registrado no cadastro das contas.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Distribuicao</CardDescription>
            <CardTitle>
              {summary.byType.checking} corrente / {summary.byType.investment} investimento / {summary.byType.cash} caixa
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Visao rapida dos tipos em uso na entidade atual.
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Como usar este modulo</CardTitle>
            <CardDescription>
              Cada conta representa um lugar real onde o dinheiro circula.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Use contas correntes para bancos e wallets, caixa para dinheiro
              fisico e investimento para saldos que voce acompanha separado.
            </p>
            <p>
              Transacoes, recorrencias, cartoes e compras parceladas podem se
              vincular a essas contas para manter o saldo organizado.
            </p>
            <p>
              Se uma conta ja estiver em uso, o sistema bloqueia a exclusao para
              evitar apagar historico financeiro sem querer.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 xl:col-span-2 md:grid-cols-2">
          {isFetchingAccounts && (
            <Card className="md:col-span-2">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                Carregando contas...
              </CardContent>
            </Card>
          )}

          {!isFetchingAccounts && (accounts?.length ?? 0) === 0 && (
            <Card className="md:col-span-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <IconBuildingBank className="size-10 text-muted-foreground" />
                <div>
                  <p className="font-medium">Nenhuma conta cadastrada</p>
                  <p className="text-muted-foreground text-sm">
                    Crie a primeira conta da entidade ativa para comecar a registrar
                    transacoes, cartoes e movimentacoes.
                  </p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <IconPlus className="mr-2 size-4" />
                  Criar conta
                </Button>
              </CardContent>
            </Card>
          )}

          {accounts?.map((account) => {
            const currentBalance =
              balancesByAccountId.get(account.id ?? "") ??
              Number(account.initialBalance);

            return (
              <Card key={account.id} className="overflow-hidden">
                <div
                  className="h-2 w-full"
                  style={{ backgroundColor: account.color ?? DEFAULT_ACCOUNT_COLOR }}
                />
                <CardHeader>
                  <CardDescription>
                    {ACCOUNT_TYPE_LABELS_PT[account.type]}
                  </CardDescription>
                  <CardTitle>{account.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-muted-foreground">Saldo atual</p>
                      <strong>{formatMoney(currentBalance)}</strong>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-muted-foreground">Saldo inicial</p>
                      <strong>{formatMoney(Number(account.initialBalance))}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IconWallet className="size-4" />
                    <span>
                      Cor de identificacao: {account.color ?? DEFAULT_ACCOUNT_COLOR}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setAccountBeingEdited(account)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleDeleteAccount(account)}
                      disabled={isDeleting}
                    >
                      <IconTrash className="mr-2 size-4" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <AccountModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        action="create"
        onSuccess={handleCreateAccountSuccess}
      />

      <AccountModal
        isOpen={Boolean(accountBeingEdited)}
        onClose={() => setAccountBeingEdited(null)}
        action="update"
        account={accountBeingEdited}
      />
    </div>
  );
}
