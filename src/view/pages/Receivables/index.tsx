import {
  IconAlertTriangle,
  IconArrowLeft,
  IconArrowRight,
  IconCalendarDue,
  IconCashBanknote,
  IconCheck,
  IconChevronDown,
  IconEdit,
  IconFileInvoice,
  IconRefresh,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { useDeferredValue, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import type { ReceivablePayment } from "@/app/entities/Invoice";
import type {
  Receivable,
  ReceivableFilterStatus,
  ReceivableSort,
} from "@/app/entities/Receivable";
import { useAuth } from "@/app/hooks/useAuth";
import { useReceivables } from "@/app/hooks/useReceivables";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReceivablePaymentModal } from "@/view/modals/ReceivablePaymentModal";
import { formatCurrency } from "@/view/pages/PurchaseOrders/purchaseOrderPresentation";

const filterStatuses: ReceivableFilterStatus[] = [
  "ALL",
  "PENDING",
  "OVERDUE",
  "OPEN",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "NOT_ISSUED",
  "CANCELLED",
];

const statusLabels: Record<ReceivableFilterStatus, string> = {
  ALL: "Todas as situacoes",
  PENDING: "Todos os saldos pendentes",
  NOT_ISSUED: "Rascunhos",
  OPEN: "Em aberto",
  OVERDUE: "Vencidas",
  PARTIALLY_RECEIVED: "Recebidas parcialmente",
  RECEIVED: "Quitadas",
  CANCELLED: "Canceladas",
};

const statusClasses: Record<Receivable["receivableStatus"], string> = {
  NOT_ISSUED: "bg-zinc-500/10 text-zinc-300",
  OPEN: "bg-sky-500/10 text-sky-300",
  OVERDUE: "bg-red-500/10 text-red-300",
  PARTIALLY_RECEIVED: "bg-amber-500/10 text-amber-300",
  RECEIVED: "bg-emerald-500/10 text-emerald-300",
  CANCELLED: "bg-zinc-500/10 text-zinc-400",
};

const sortLabels: Record<ReceivableSort, string> = {
  URGENCY: "Mais urgentes",
  DUE_ASC: "Vencimento mais proximo",
  DUE_DESC: "Vencimento mais distante",
  BALANCE_DESC: "Maior saldo",
  ISSUED_DESC: "Emissao mais recente",
};

function readInitialStatus(value: string | null): ReceivableFilterStatus {
  return filterStatuses.includes(value as ReceivableFilterStatus)
    ? (value as ReceivableFilterStatus)
    : "PENDING";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(value)
  );
}

function formatDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function Receivables() {
  const { selectedEntityId, activeEntity } = useAuth();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<ReceivableFilterStatus>(() =>
    readInitialStatus(searchParams.get("status"))
  );
  const [sort, setSort] = useState<ReceivableSort>("URGENCY");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [page, setPage] = useState(1);
  const [paymentTarget, setPaymentTarget] = useState<{
    invoice: Receivable;
    payment?: ReceivablePayment;
  } | null>(null);
  const { data, isFetching, isError, refetch } = useReceivables(
    selectedEntityId
      ? {
          entityId: selectedEntityId,
          search: deferredSearch || undefined,
          status,
          sort,
          dueFrom: dueFrom || undefined,
          dueTo: dueTo || undefined,
          page,
          pageSize: 20,
        }
      : null
  );

  const summary = data?.summary;
  const today = new Date();
  const tomorrow = new Date(today);
  const nextWeek = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const todayInput = formatDateInput(today);
  const tomorrowInput = formatDateInput(tomorrow);
  const nextWeekInput = formatDateInput(nextWeek);
  const hasFilters =
    Boolean(search || dueFrom || dueTo) ||
    status !== "PENDING" ||
    sort !== "URGENCY";

  const updateStatus = (value: ReceivableFilterStatus) => {
    setStatus(value);
    setPage(1);
  };

  const filterByStatus = (value: ReceivableFilterStatus) => {
    setStatus(value);
    setDueFrom("");
    setDueTo("");
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("PENDING");
    setSort("URGENCY");
    setDueFrom("");
    setDueTo("");
    setPage(1);
  };

  const filterByDuePeriod = (startOffset: number, endOffset: number) => {
    const from = new Date();
    const to = new Date();
    from.setDate(from.getDate() + startOffset);
    to.setDate(to.getDate() + endOffset);

    setStatus("PENDING");
    setSort("DUE_ASC");
    setDueFrom(formatDateInput(from));
    setDueTo(formatDateInput(to));
    setPage(1);
  };

  return (
    <>
      <div className="flex flex-col gap-6 px-4 py-5 lg:px-6 lg:py-7">
        <section className="relative overflow-hidden rounded-3xl border bg-[radial-gradient(circle_at_88%_8%,rgba(14,165,233,0.20),transparent_32%),radial-gradient(circle_at_12%_100%,rgba(16,185,129,0.12),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.05),transparent)] p-6 sm:p-8">
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
                Ciclo financeiro do cliente
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
                Contas a receber
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Acompanhe notas, vencimentos, pagamentos parciais e atrasos da {" "}
                {activeEntity?.name ?? "organizacao ativa"} sem perder o vinculo
                com a ordem e o cliente.
              </p>
            </div>
            <Button variant="outline" size="lg" asChild>
              <Link to="/orders">
                <IconFileInvoice /> Abrir ordens para faturar
              </Link>
            </Button>
          </div>
          <IconCashBanknote className="absolute -bottom-10 -right-8 size-56 rotate-[-8deg] text-sky-300/[0.05]" />
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <SummaryCard
            label="Saldo em aberto"
            value={summary?.openAmount ?? 0}
            detail={`${summary?.openCount ?? 0} titulo(s)`}
            active={status === "PENDING" && !dueFrom && !dueTo}
            onClick={() => filterByStatus("PENDING")}
          />
          <SummaryCard
            label="Vencido"
            value={summary?.overdueAmount ?? 0}
            detail={`${summary?.overdueCount ?? 0} em atraso`}
            tone="red"
            active={status === "OVERDUE" && !dueFrom && !dueTo}
            onClick={() => filterByStatus("OVERDUE")}
          />
          <SummaryCard
            label="Vence hoje"
            value={summary?.dueTodayAmount ?? 0}
            detail={`${summary?.dueTodayCount ?? 0} titulo(s)`}
            tone="amber"
            active={dueFrom === todayInput && dueTo === todayInput}
            onClick={() => filterByDuePeriod(0, 0)}
          />
          <SummaryCard
            label="Proximos 7 dias"
            value={summary?.dueNext7DaysAmount ?? 0}
            detail={`${summary?.dueNext7DaysCount ?? 0} titulo(s)`}
            tone="sky"
            active={dueFrom === tomorrowInput && dueTo === nextWeekInput}
            onClick={() => filterByDuePeriod(1, 7)}
          />
          <SummaryCard
            label="Total recebido"
            value={summary?.receivedAmount ?? 0}
            detail={`${summary?.receivedCount ?? 0} quitado(s)`}
            tone="emerald"
            active={status === "RECEIVED" && !dueFrom && !dueTo}
            onClick={() => filterByStatus("RECEIVED")}
          />
        </section>

        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b py-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Carteira de recebiveis</CardTitle>
                <CardDescription className="mt-1">
                  Busque por nota, ordem, cliente, documento ou produto.
                </CardDescription>
              </div>
              <p className="text-sm text-muted-foreground">
                {data?.pagination.total ?? 0} resultado(s)
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="grid gap-3 xl:grid-cols-[minmax(16rem,1fr)_14rem_14rem_minmax(11rem,0.65fr)_minmax(11rem,0.65fr)_auto]">
              <div className="relative">
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Nota, ordem, cliente ou produto"
                  aria-label="Pesquisar contas a receber"
                  className="pl-9"
                />
              </div>
              <Select
                value={status}
                onValueChange={(value) =>
                  updateStatus(value as ReceivableFilterStatus)
                }
              >
                <SelectTrigger className="w-full" aria-label="Situacao do recebivel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filterStatuses.map((value) => (
                    <SelectItem key={value} value={value}>
                      {statusLabels[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={sort}
                onValueChange={(value) => {
                  setSort(value as ReceivableSort);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full" aria-label="Ordenar recebiveis">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(sortLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={dueFrom}
                max={dueTo || undefined}
                onChange={(event) => {
                  setDueFrom(event.target.value);
                  setPage(1);
                }}
                aria-label="Vencimento inicial"
                className="[color-scheme:dark]"
              />
              <Input
                type="date"
                value={dueTo}
                min={dueFrom || undefined}
                onChange={(event) => {
                  setDueTo(event.target.value);
                  setPage(1);
                }}
                aria-label="Vencimento final"
                className="[color-scheme:dark]"
              />
              <Button
                variant="ghost"
                disabled={!hasFilters}
                onClick={clearFilters}
              >
                <IconX /> Limpar
              </Button>
            </div>

            {isFetching && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Atualizando carteira...
              </p>
            )}
            {isError && (
              <div className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 p-5 sm:flex-row sm:items-center">
                <p className="flex-1 text-sm">
                  Nao foi possivel carregar as contas a receber.
                </p>
                <Button variant="outline" onClick={() => refetch()}>
                  <IconRefresh /> Tentar novamente
                </Button>
              </div>
            )}
            {!isFetching && !isError && !data?.receivables.length && (
              <div className="rounded-2xl border border-dashed py-14 text-center">
                <IconCashBanknote className="mx-auto size-9 text-muted-foreground" />
                <p className="mt-4 font-semibold">Nenhum recebivel encontrado</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Ajuste os filtros ou emita uma nota no detalhe de uma ordem de compra.
                </p>
              </div>
            )}

            <div className="space-y-3">
              {data?.receivables.map((receivable) => (
                <ReceivableCard
                  key={receivable.id}
                  receivable={receivable}
                  onReceive={() => setPaymentTarget({ invoice: receivable })}
                  onEditPayment={(payment) =>
                    setPaymentTarget({ invoice: receivable, payment })
                  }
                />
              ))}
            </div>

            {data && data.pagination.totalPages > 1 && (
              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Pagina {data.pagination.page} de {data.pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={data.pagination.page <= 1 || isFetching}
                    onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  >
                    <IconArrowLeft /> Anterior
                  </Button>
                  <Button
                    variant="outline"
                    disabled={
                      data.pagination.page >= data.pagination.totalPages ||
                      isFetching
                    }
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Proxima <IconArrowRight />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ReceivablePaymentModal
        isOpen={Boolean(paymentTarget)}
        onClose={() => setPaymentTarget(null)}
        purchaseOrderId={paymentTarget?.invoice.purchaseOrderId ?? ""}
        invoice={paymentTarget?.invoice ?? null}
        payment={paymentTarget?.payment ?? null}
      />
    </>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  tone = "default",
  active = false,
  onClick,
}: {
  label: string;
  value: number;
  detail: string;
  tone?: "default" | "red" | "amber" | "sky" | "emerald";
  active?: boolean;
  onClick?: () => void;
}) {
  const tones = {
    default: "text-foreground",
    red: "text-red-300",
    amber: "text-amber-300",
    sky: "text-sky-300",
    emerald: "text-emerald-300",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="min-w-0 text-left"
    >
      <Card
        className={`h-full gap-3 transition-colors ${
          active
            ? "border-emerald-400/45 bg-emerald-500/[0.04]"
            : onClick
              ? "hover:border-emerald-400/30 hover:bg-muted/15"
              : ""
        }`}
      >
        <CardHeader>
          <CardDescription>{label}</CardDescription>
          <CardTitle className={`text-2xl ${tones[tone]}`}>
            {formatCurrency(value)}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {detail}
        </CardContent>
      </Card>
    </button>
  );
}

function ReceivableCard({
  receivable,
  onReceive,
  onEditPayment,
}: {
  receivable: Receivable;
  onReceive: () => void;
  onEditPayment: (payment: ReceivablePayment) => void;
}) {
  const receivedPercent = receivable.netReceivableAmount
    ? Math.min(
        Math.round(
          (receivable.receivedAmount / receivable.netReceivableAmount) * 100
        ),
        100
      )
    : 0;
  const canReceive =
    receivable.status === "ISSUED" && receivable.outstandingAmount > 0;

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-card ${
        receivable.receivableStatus === "OVERDUE"
          ? "border-red-500/30 bg-red-500/[0.025]"
          : ""
      }`}
    >
      <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(10rem,0.7fr)_minmax(18rem,1fr)_auto] xl:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[receivable.receivableStatus]}`}
            >
              {statusLabels[receivable.receivableStatus]}
            </span>
            {receivable.daysOverdue > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs text-red-300">
                <IconAlertTriangle className="size-3" />
                {receivable.daysOverdue} dia(s) em atraso
              </span>
            )}
          </div>
          <h3 className="mt-3 truncate text-lg font-semibold">
            {receivable.customerName}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Nota {receivable.invoiceNumber} - Ordem {receivable.orderNumber}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconCalendarDue className="size-3.5" />
            Emitida em {formatDate(receivable.issuedAt)} - vence em {" "}
            <span
              className={
                receivable.receivableStatus === "OVERDUE" ? "text-red-300" : ""
              }
            >
              {formatDate(receivable.dueAt)}
            </span>
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Saldo atual
          </p>
          <p
            className={`mt-1 text-2xl font-semibold ${
              receivable.outstandingAmount > 0
                ? "text-amber-300"
                : "text-emerald-300"
            }`}
          >
            {formatCurrency(receivable.outstandingAmount)}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">
              {formatCurrency(receivable.receivedAmount)} recebido de {" "}
              {formatCurrency(receivable.netReceivableAmount)}
            </span>
            <span className="font-medium">{receivedPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-400 transition-[width]"
              style={{ width: `${receivedPercent}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1 text-xs text-muted-foreground">
            <span>{receivable.items.length} item(ns) faturado(s)</span>
            <span>{receivable.payments.length} baixa(s) registrada(s)</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
          {canReceive && (
            <Button onClick={onReceive}>
              <IconCashBanknote /> Registrar recebimento
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to={`/orders/${receivable.purchaseOrderId}`}>
              Abrir ordem <IconArrowRight />
            </Link>
          </Button>
        </div>
      </div>

      <details className="group border-t bg-muted/[0.03]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium sm:px-5">
          Itens faturados e historico de recebimentos
          <IconChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="grid gap-5 border-t p-4 sm:p-5 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Itens da nota
            </p>
            <div className="space-y-2">
              {receivable.items.map((item) => (
                <div
                  key={item.id ?? item.purchaseOrderItemId}
                  className="flex items-start justify-between gap-4 rounded-xl border bg-background/30 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{item.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.invoicedQuantity.toLocaleString("pt-BR")} {item.originalUnit} a {" "}
                      {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold">
                    {formatCurrency(item.totalAmount)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Historico financeiro
            </p>
            {!receivable.payments.length && (
              <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                Nenhum recebimento registrado para esta nota.
              </div>
            )}
            <div className="space-y-2">
              {receivable.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-col gap-3 rounded-xl border bg-background/30 p-3 sm:flex-row sm:items-center"
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                      payment.status === "CONFIRMED"
                        ? "bg-emerald-500/10 text-emerald-300"
                        : "bg-zinc-500/10 text-zinc-400"
                    }`}
                  >
                    <IconCheck className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {formatCurrency(payment.amount)} - {payment.paymentMethod}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(payment.receivedAt)}
                      {payment.reference ? ` - ${payment.reference}` : ""}
                      {payment.status === "CANCELLED" ? " - cancelado" : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEditPayment(payment)}
                  >
                    <IconEdit /> Editar
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </details>
    </article>
  );
}
