import {
  IconAlertTriangle,
  IconCash,
  IconCheck,
  IconCreditCard,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { QueryKeys } from "@/app/config/QueryKeys";
import type { CreditCard } from "@/app/entities/CreditCard";
import type { Payable, PayableStatus } from "@/app/entities/Payable";
import { useAuth } from "@/app/hooks/useAuth";
import { useCreditCards } from "@/app/hooks/useCreditCards";
import { usePayables } from "@/app/hooks/usePayables";
import { useOperationsDashboard } from "@/app/hooks/useOperationsDashboard";
import { payableService } from "@/app/services/payableService";
import { treatAxiosError } from "@/app/utils/treatAxiosError";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCardModal } from "@/view/modals/CreditCardModal";
import { formatCurrency } from "@/view/pages/PurchaseOrders/purchaseOrderPresentation";

const paymentMethodLabels: Record<string, string> = {
  PIX: "PIX",
  CREDIT_CARD: "Cartao de credito",
  DEBIT_CARD: "Cartao de debito",
  BOLETO: "Boleto",
  BANK_TRANSFER: "Transferencia",
  CASH: "Dinheiro",
  OTHER: "Outro",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value));
}

function statementMonthKey(value: string) {
  const date = new Date(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatStatementMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));

  return label.charAt(0).toUpperCase() + label.slice(1);
}

type OpenCardStatement = {
  key: string;
  monthKey: string;
  year: number;
  month: number;
  creditCardId: string;
  cardName: string;
  cardLastFour?: string;
  cardColor: string;
  payables: Payable[];
  totalAmount: number;
  overdueCount: number;
};

function buildOpenCardStatements(
  payables: Payable[],
  creditCards: CreditCard[]
) {
  const cardsById = new Map(creditCards.map((card) => [card.id, card]));
  const statements = new Map<string, OpenCardStatement>();

  payables.forEach((payable) => {
    if (!payable.creditCardId || payable.status !== "OPEN") return;

    const monthKey = statementMonthKey(payable.dueAt);
    const key = `${payable.creditCardId}:${monthKey}`;
    const card = cardsById.get(payable.creditCardId);
    const current = statements.get(key) ?? {
      key,
      monthKey,
      year: Number(monthKey.slice(0, 4)),
      month: Number(monthKey.slice(5, 7)),
      creditCardId: payable.creditCardId,
      cardName: payable.cardName ?? card?.name ?? "Cartao",
      cardLastFour: payable.cardLastFour ?? card?.lastFour,
      cardColor: card?.color ?? "#059669",
      payables: [],
      totalAmount: 0,
      overdueCount: 0,
    };

    current.payables.push(payable);
    current.totalAmount += payable.amount;
    current.overdueCount += payable.overdue ? 1 : 0;
    statements.set(key, current);
  });

  return [...statements.values()]
    .map((statement) => ({
      ...statement,
      totalAmount:
        Math.round((statement.totalAmount + Number.EPSILON) * 100) / 100,
    }))
    .sort(
      (a, b) =>
        a.monthKey.localeCompare(b.monthKey) ||
        a.cardName.localeCompare(b.cardName, "pt-BR")
    );
}

export default function Finance() {
  const { selectedEntityId, activeEntity } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<PayableStatus | "ALL">("OPEN");
  const [creditCardId, setCreditCardId] = useState("ALL");
  const [statementMonth, setStatementMonth] = useState("");
  const [statementToSettle, setStatementToSettle] =
    useState<OpenCardStatement | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cardBeingEdited, setCardBeingEdited] = useState<CreditCard | null>(null);
  const { data: creditCards = [] } = useCreditCards(selectedEntityId);
  const { dashboard } = useOperationsDashboard(
    selectedEntityId ?? "",
    Boolean(selectedEntityId)
  );
  const { data, isFetching, isError, refetch } = usePayables(
    selectedEntityId
      ? {
          entityId: selectedEntityId,
          status: status === "ALL" ? undefined : status,
          creditCardId: creditCardId === "ALL" ? undefined : creditCardId,
          search: deferredSearch || undefined,
        }
      : null
  );
  const {
    data: openPayablesData,
    isFetching: isFetchingStatements,
    isError: isStatementsError,
    refetch: refetchStatements,
  } = usePayables(
    selectedEntityId
      ? { entityId: selectedEntityId, status: "OPEN" }
      : null
  );
  const updateMutation = useMutation({ mutationFn: payableService.update });
  const settleStatementMutation = useMutation({
    mutationFn: payableService.settleCreditCardStatement,
  });
  const openCardStatements = buildOpenCardStatements(
    openPayablesData?.payables ?? [],
    creditCards
  );
  const statementMonths = [
    ...new Set(openCardStatements.map((statement) => statement.monthKey)),
  ];
  const selectedStatementMonth = statementMonths.includes(statementMonth)
    ? statementMonth
    : statementMonths[0] ?? "";
  const visibleStatements = openCardStatements.filter(
    (statement) => statement.monthKey === selectedStatementMonth
  );

  const updatePayable = async (payableId: string, nextStatus: "OPEN" | "PAID") => {
    if (!selectedEntityId) return;
    try {
      await updateMutation.mutateAsync({
        entityId: selectedEntityId,
        payableId,
        status: nextStatus,
        paidAt: nextStatus === "PAID" ? new Date().toISOString() : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.PAYABLES] });
      toast.success(nextStatus === "PAID" ? "Pagamento confirmado." : "Conta reaberta.");
    } catch (error) {
      treatAxiosError(error);
    }
  };

  const settleStatement = async () => {
    if (!selectedEntityId || !statementToSettle) return;

    try {
      const settlement = await settleStatementMutation.mutateAsync({
        entityId: selectedEntityId,
        creditCardId: statementToSettle.creditCardId,
        year: statementToSettle.year,
        month: statementToSettle.month,
        paidAt: new Date().toISOString(),
      });
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.PAYABLES] });
      toast.success(
        `${settlement.settledCount} parcela(s) de ${formatStatementMonth(
          statementToSettle.monthKey
        )} quitada(s), totalizando ${formatCurrency(
          settlement.settledAmount
        )}.`
      );
      setStatementToSettle(null);
    } catch (error) {
      treatAxiosError(error);
    }
  };

  const closeCardModal = () => {
    setIsCardModalOpen(false);
    setCardBeingEdited(null);
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-5 lg:px-6 lg:py-7">
      <section className="relative overflow-hidden rounded-2xl border bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.2),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent)] p-5 sm:p-7">
        <div className="absolute -right-10 -top-20 size-56 rounded-full border border-emerald-400/10" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">Controle financeiro operacional</p>
            <h2 className="text-3xl font-semibold tracking-tight">Financeiro</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Acompanhe parcelas geradas pelas compras, vencimentos e os cartoes usados pela {activeEntity?.name ?? "organizacao ativa"}.
            </p>
          </div>
          <Button size="lg" className="w-full md:w-auto" onClick={() => setIsCardModalOpen(true)}>
            <IconPlus /> Novo cartao
          </Button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard label="Em aberto" value={data?.summary.openAmount ?? 0} detail={`${data?.summary.openCount ?? 0} parcela(s)`} icon={<IconCash />} />
        <SummaryCard label="Vencidas" value={data?.summary.overdueAmount ?? 0} detail={`${data?.summary.overdueCount ?? 0} em atraso`} icon={<IconAlertTriangle />} tone="red" />
        <SummaryCard label="Proximos 30 dias" value={data?.summary.dueNext30DaysAmount ?? 0} detail="Compromissos proximos" icon={<IconCreditCard />} tone="amber" />
        <SummaryCard label="A receber" value={dashboard?.receivables.openTotal ?? 0} detail={`${dashboard?.receivables.openCount ?? 0} faturamento(s) em aberto`} icon={<IconCash />} tone="sky" href="/receivables?status=PENDING" />
        <SummaryCard label="Recebido" value={dashboard?.receivables.receivedTotal ?? 0} detail="Entradas confirmadas" icon={<IconCheck />} href="/receivables?status=RECEIVED" />
        <SummaryCard label="Recebiveis vencidos" value={dashboard?.receivables.overdueTotal ?? 0} detail={`${dashboard?.receivables.overdueCount ?? 0} em atraso`} icon={<IconAlertTriangle />} tone="red" href="/receivables?status=OVERDUE" />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Cartoes cadastrados</h3>
            <p className="text-sm text-muted-foreground">Fechamento e vencimento ficam visiveis antes de parcelar.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {creditCards.map((card) => (
            <button
              type="button"
              key={card.id}
              onClick={() => { setCardBeingEdited(card); setIsCardModalOpen(true); }}
              className="group overflow-hidden rounded-2xl border bg-card text-left transition-colors hover:border-emerald-500/40"
            >
              <div className="h-1.5" style={{ backgroundColor: card.color }} />
              <div className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{card.name}</p>
                    <p className="text-sm text-muted-foreground">{card.bank} - {card.brand}</p>
                  </div>
                  <IconEdit className="size-4 text-muted-foreground group-hover:text-emerald-400" />
                </div>
                <p className="font-mono text-lg tracking-[0.2em]">•••• {card.lastFour}</p>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Fecha dia {card.closingDay}</span>
                  <span>Vence dia {card.dueDay}</span>
                </div>
              </div>
            </button>
          ))}
          {!creditCards.length && (
            <button type="button" onClick={() => setIsCardModalOpen(true)} className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground hover:border-emerald-500/40 hover:text-foreground">
              Cadastre o primeiro cartao para registrar compras parceladas.
            </button>
          )}
        </div>
      </section>

      <Card className="overflow-hidden border-emerald-500/15">
        <CardHeader className="gap-4 border-b lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Faturas por cartao</CardTitle>
            <CardDescription className="mt-1">
              Selecione o mes de vencimento e quite todas as parcelas abertas
              daquela fatura de uma so vez.
            </CardDescription>
          </div>
          <Select
            value={selectedStatementMonth}
            onValueChange={setStatementMonth}
            disabled={!statementMonths.length}
          >
            <SelectTrigger className="w-full lg:w-56">
              <SelectValue placeholder="Nenhuma fatura aberta" />
            </SelectTrigger>
            <SelectContent>
              {statementMonths.map((month) => (
                <SelectItem key={month} value={month}>
                  {formatStatementMonth(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          {isFetchingStatements && (
            <p className="py-8 text-sm text-muted-foreground">
              Organizando faturas abertas...
            </p>
          )}
          {isStatementsError && (
            <div className="flex items-center gap-3 rounded-xl border border-destructive/30 p-4">
              <p className="flex-1 text-sm">
                Nao foi possivel carregar as faturas dos cartoes.
              </p>
              <Button variant="outline" onClick={() => refetchStatements()}>
                <IconRefresh /> Tentar novamente
              </Button>
            </div>
          )}
          {!isFetchingStatements &&
            !isStatementsError &&
            !visibleStatements.length && (
              <div className="rounded-xl border border-dashed py-10 text-center">
                <p className="font-medium">Nenhuma fatura em aberto</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  As parcelas de cartao aparecerao aqui agrupadas pelo mes de
                  vencimento.
                </p>
              </div>
            )}
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {visibleStatements.map((statement) => (
              <article
                key={statement.key}
                className="overflow-hidden rounded-2xl border bg-card"
              >
                <div
                  className="h-1.5"
                  style={{ backgroundColor: statement.cardColor }}
                />
                <div className="space-y-5 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{statement.cardName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {statement.cardLastFour
                          ? `Final ${statement.cardLastFour}`
                          : "Cartao cadastrado"}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                      {formatStatementMonth(statement.monthKey)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Total em aberto
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                      {formatCurrency(statement.totalAmount)}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {statement.payables.length} parcela(s)
                      {statement.overdueCount > 0
                        ? `, ${statement.overdueCount} vencida(s)`
                        : " nesta fatura"}
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => setStatementToSettle(statement)}
                  >
                    <IconCheck /> Marcar fatura paga
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contas a pagar</CardTitle>
          <CardDescription>As parcelas sao criadas automaticamente ao registrar uma compra.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_190px_220px]">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar vendedor ou ordem" className="pl-9" />
            </div>
            <Select value={status} onValueChange={(value) => setStatus(value as PayableStatus | "ALL")}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as situacoes</SelectItem>
                <SelectItem value="OPEN">Em aberto</SelectItem>
                <SelectItem value="PAID">Pagas</SelectItem>
                <SelectItem value="CANCELLED">Canceladas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={creditCardId} onValueChange={setCreditCardId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Todos os cartoes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os meios</SelectItem>
                {creditCards.map((card) => <SelectItem key={card.id} value={card.id}>{card.name} final {card.lastFour}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isFetching && <p className="py-8 text-sm text-muted-foreground">Carregando contas...</p>}
          {isError && (
            <div className="flex items-center gap-3 rounded-xl border border-destructive/30 p-4">
              <p className="flex-1 text-sm">Nao foi possivel carregar as contas a pagar.</p>
              <Button variant="outline" onClick={() => refetch()}><IconRefresh /> Tentar novamente</Button>
            </div>
          )}
          {!isFetching && !isError && !data?.payables.length && (
            <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">Nenhuma conta encontrada para os filtros atuais.</div>
          )}
          <div className="space-y-2">
            {data?.payables.map((payable) => (
              <div key={payable.id} className={`flex flex-col gap-4 rounded-xl border p-4 lg:flex-row lg:items-center ${payable.overdue ? "border-red-500/30 bg-red-500/[0.03]" : ""}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{payable.sellerName ?? payable.description}</p>
                    <StatusBadge status={payable.status} overdue={payable.overdue} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ordem {payable.orderNumber} - {paymentMethodLabels[payable.paymentMethod] ?? payable.paymentMethod}
                    {payable.cardName ? ` - ${payable.cardName} final ${payable.cardLastFour}` : ""}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm lg:w-72">
                  <div><p className="text-xs text-muted-foreground">Parcela</p><p>{payable.installmentNumber}/{payable.installmentCount}</p></div>
                  <div><p className="text-xs text-muted-foreground">Vencimento</p><p className={payable.overdue ? "text-red-300" : ""}>{formatDate(payable.dueAt)}</p></div>
                </div>
                <p className="text-lg font-semibold lg:w-32 lg:text-right">{formatCurrency(payable.amount)}</p>
                {payable.status !== "CANCELLED" && (
                  <Button
                    variant={payable.status === "PAID" ? "outline" : "default"}
                    disabled={updateMutation.isPending}
                    onClick={() => updatePayable(payable.id, payable.status === "PAID" ? "OPEN" : "PAID")}
                  >
                    {payable.status === "PAID" ? <><IconRefresh /> Reabrir</> : <><IconCheck /> Marcar paga</>}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(statementToSettle)}
        onOpenChange={(open) => {
          if (!open && !settleStatementMutation.isPending) {
            setStatementToSettle(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar pagamento da fatura?</DialogTitle>
            <DialogDescription>
              Todas as parcelas abertas do cartao e do mes selecionados serao
              marcadas como pagas. Parcelas de outros meses nao serao
              alteradas.
            </DialogDescription>
          </DialogHeader>
          {statementToSettle && (
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">
                    {statementToSettle.cardName}
                    {statementToSettle.cardLastFour
                      ? ` final ${statementToSettle.cardLastFour}`
                      : ""}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatStatementMonth(statementToSettle.monthKey)} - {" "}
                    {statementToSettle.payables.length} parcela(s)
                  </p>
                </div>
                <p className="text-lg font-semibold text-emerald-300">
                  {formatCurrency(statementToSettle.totalAmount)}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={settleStatementMutation.isPending}
              onClick={() => setStatementToSettle(null)}
            >
              Cancelar
            </Button>
            <Button
              isLoading={settleStatementMutation.isPending}
              onClick={settleStatement}
            >
              <IconCheck /> Confirmar pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreditCardModal isOpen={isCardModalOpen} onClose={closeCardModal} card={cardBeingEdited} />
    </div>
  );
}

function SummaryCard({ label, value, detail, icon, tone = "emerald", href }: {
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
  tone?: "emerald" | "red" | "amber" | "sky";
  href?: string;
}) {
  const tones = {
    emerald: "bg-emerald-500/10 text-emerald-400",
    red: "bg-red-500/10 text-red-400",
    amber: "bg-amber-500/10 text-amber-400",
    sky: "bg-sky-500/10 text-sky-400",
  };
  const card = (
    <Card className="gap-3">
      <CardHeader className="flex-row items-start justify-between">
        <div><CardDescription>{label}</CardDescription><CardTitle className="mt-2 text-2xl">{formatCurrency(value)}</CardTitle></div>
        <div className={`rounded-xl p-2 ${tones[tone]}`}>{icon}</div>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{detail}</CardContent>
    </Card>
  );

  return href ? (
    <Link to={href} className="rounded-xl outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-emerald-400/70">
      {card}
    </Link>
  ) : card;
}

function StatusBadge({ status, overdue }: { status: PayableStatus; overdue: boolean }) {
  const label = status === "PAID" ? "Paga" : status === "CANCELLED" ? "Cancelada" : overdue ? "Vencida" : "Em aberto";
  const style = status === "PAID" ? "bg-emerald-500/10 text-emerald-300" : status === "CANCELLED" ? "bg-zinc-500/10 text-zinc-300" : overdue ? "bg-red-500/10 text-red-300" : "bg-amber-500/10 text-amber-300";
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${style}`}>{label}</span>;
}
