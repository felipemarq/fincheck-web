import { useEffect, useMemo, useState } from "react";

import { Transaction } from "@/app/entities/Transaction";
import { useAuth } from "@/app/hooks/useAuth";
import { useDashboard } from "@/app/hooks/useDashboard";
import { useTransactions } from "@/app/hooks/useTransactions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TransactionsTable } from "@/view/components/TransactionTable";

type StatusFilter = "all" | "overdue" | "today" | "upcoming";

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDueDate(value?: string | null) {
  if (!value) return "Sem vencimento";
  return new Date(value).toLocaleDateString("pt-BR");
}

export default function Receivables() {
  const { selectedEntityId } = useAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  const { dashboard } = useDashboard(
    {
      entityId: selectedEntityId!,
      sections: ["settlements"],
    },
    Boolean(selectedEntityId)
  );

  const receivables = dashboard?.settlements?.receivables;
  const horizonDays = dashboard?.settlements?.horizonDays ?? 7;

  const statusRange = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    if (statusFilter === "overdue") {
      return {
        dueDateStart: undefined,
        dueDateEnd: endOfDay(addDays(todayStart, -1)).toISOString(),
      };
    }

    if (statusFilter === "today") {
      return {
        dueDateStart: todayStart.toISOString(),
        dueDateEnd: todayEnd.toISOString(),
      };
    }

    if (statusFilter === "upcoming") {
      return {
        dueDateStart: startOfDay(addDays(todayStart, 1)).toISOString(),
        dueDateEnd: endOfDay(addDays(todayStart, horizonDays)).toISOString(),
      };
    }

    return {
      dueDateStart: undefined,
      dueDateEnd: undefined,
    };
  }, [horizonDays, statusFilter]);

  const groupingFilters = useMemo(
    () => ({
      entityId: selectedEntityId!,
      type: [Transaction.Type.INCOME],
      isPaid: false,
      sortBy: "dueDate" as const,
      sortDir: "asc" as const,
      page: 1,
      pageSize: 100,
      ...statusRange,
    }),
    [selectedEntityId, statusRange]
  );

  const { transactions: groupedTransactions, isFetchingTransactions } =
    useTransactions(groupingFilters, Boolean(selectedEntityId));

  const groupedByContact = useMemo(() => {
    const groups = new Map<
      string,
      {
        id: string | null;
        name: string;
        total: number;
        count: number;
        firstDueDate?: string | null;
        hasContact: boolean;
      }
    >();

    for (const transaction of groupedTransactions?.items ?? []) {
      const key = transaction.contact?.id ?? "__without_contact__";
      const existing = groups.get(key) ?? {
        id: transaction.contact?.id ?? null,
        name: transaction.contact?.name ?? "Sem contato vinculado",
        total: 0,
        count: 0,
        firstDueDate: transaction.dueDate ?? null,
        hasContact: Boolean(transaction.contact?.id),
      };

      existing.total += transaction.value;
      existing.count += 1;

      if (
        transaction.dueDate &&
        (!existing.firstDueDate ||
          new Date(transaction.dueDate) < new Date(existing.firstDueDate))
      ) {
        existing.firstDueDate = transaction.dueDate;
      }

      groups.set(key, existing);
    }

    return Array.from(groups.values()).sort((left, right) => right.total - left.total);
  }, [groupedTransactions]);

  useEffect(() => {
    if (
      selectedContactId &&
      !groupedByContact.some((group) => group.id === selectedContactId)
    ) {
      setSelectedContactId(null);
    }
  }, [groupedByContact, selectedContactId]);

  const quickFilters = [
    {
      id: "all" as const,
      label: "Em aberto",
      helper: `${receivables?.openCount ?? 0} contas`,
    },
    {
      id: "overdue" as const,
      label: "Vencidas",
      helper: `${receivables?.overdueCount ?? 0} contas`,
    },
    {
      id: "today" as const,
      label: "Hoje",
      helper: `${receivables?.dueTodayCount ?? 0} contas`,
    },
    {
      id: "upcoming" as const,
      label: `Próximos ${horizonDays} dias`,
      helper: `${receivables?.upcomingCount ?? 0} contas`,
    },
  ];

  const selectedContactGroup = groupedByContact.find(
    (group) => group.id === selectedContactId
  );

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-2xl font-semibold">Contas a receber</h1>
        <p className="text-muted-foreground text-sm">
          Filtre previsoes de entrada com um clique, visualize a concentracao
          por contato e marque recebimentos diretamente nesta tela.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total em aberto</CardDescription>
            <CardTitle>{formatMoney(receivables?.openTotal ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {receivables?.openCount ?? 0} contas aguardando recebimento.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Vencidas</CardDescription>
            <CardTitle>{formatMoney(receivables?.overdueTotal ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {receivables?.overdueCount ?? 0} contas atrasadas ate hoje.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Hoje e proximos dias</CardDescription>
            <CardTitle>
              {formatMoney(
                (receivables?.dueTodayTotal ?? 0) +
                  (receivables?.upcomingTotal ?? 0)
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {receivables?.dueTodayCount ?? 0} para hoje e{" "}
            {receivables?.upcomingCount ?? 0} nos proximos {horizonDays} dias.
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 px-4 lg:px-6">
        {quickFilters.map((filter) => (
          <Button
            key={filter.id}
            size="sm"
            variant={statusFilter === filter.id ? "default" : "outline"}
            onClick={() => setStatusFilter(filter.id)}
          >
            {filter.label}
            <span className="text-xs opacity-80">{filter.helper}</span>
          </Button>
        ))}
        {selectedContactGroup && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedContactId(null)}
          >
            Limpar contato: {selectedContactGroup.name}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Por contato</CardTitle>
            <CardDescription>
              Concentração dos recebimentos abertos no filtro atual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isFetchingTransactions && (
              <p className="text-sm text-muted-foreground">
                Carregando agrupamentos...
              </p>
            )}

            {!isFetchingTransactions && groupedByContact.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma conta encontrada para o filtro selecionado.
              </p>
            )}

            {groupedByContact.map((group) => {
              const isSelected = group.id === selectedContactId;

              return (
                <div
                  key={group.id ?? "without-contact"}
                  className={`rounded-lg border p-3 ${
                    isSelected ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{group.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {group.count} contas • proximo vencimento{" "}
                        {formatDueDate(group.firstDueDate)}
                      </p>
                    </div>
                    <strong>{formatMoney(group.total)}</strong>
                  </div>

                  <div className="mt-3">
                    {group.hasContact ? (
                      <Button
                        size="sm"
                        variant={isSelected ? "secondary" : "outline"}
                        className="w-full"
                        onClick={() =>
                          setSelectedContactId((current) =>
                            current === group.id ? null : group.id
                          )
                        }
                      >
                        {isSelected
                          ? "Mostrando este contato"
                          : "Filtrar tabela por este contato"}
                      </Button>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        Este grupo reúne contas sem contato vinculado.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Lista operacional</CardTitle>
            <CardDescription>
              Use a ação rápida da tabela para marcar cada conta como recebida
              sem sair desta visão.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {selectedEntityId && (
              <TransactionsTable
                key={`${selectedEntityId}-${statusFilter}-${selectedContactId ?? "all"}`}
                entityId={selectedEntityId}
                initialTypes={[Transaction.Type.INCOME]}
                initialIsPaid="false"
                initialSortBy="dueDate"
                initialSortDir="asc"
                initialDueDateStart={statusRange.dueDateStart}
                initialDueDateEnd={statusRange.dueDateEnd}
                initialContactIds={selectedContactId ? [selectedContactId] : []}
                quickSettleMode="receivable"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
