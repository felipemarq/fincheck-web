import {
  IconAlertTriangle,
  IconArrowRight,
  IconBuildingWarehouse,
  IconCalendar,
  IconCashBanknote,
  IconChartBar,
  IconClockExclamation,
  IconFileInvoice,
  IconExternalLink,
  IconLoader2,
  IconPackageExport,
  IconPackageImport,
  IconShoppingCart,
  IconTruckDelivery,
} from "@tabler/icons-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "@/app/hooks/useAuth";
import { useOperationsDashboard } from "@/app/hooks/useOperationsDashboard";
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
import {
  formatCurrency,
  formatDate,
  progressLabels,
} from "@/view/pages/PurchaseOrders/purchaseOrderPresentation";

type DashboardPeriodPreset = "7" | "15" | "30" | "CUSTOM";

type DashboardPeriod = {
  issuedFrom: string;
  issuedTo: string;
};

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function buildLastDaysPeriod(days: number): DashboardPeriod {
  const issuedTo = new Date();
  issuedTo.setHours(0, 0, 0, 0);
  const issuedFrom = new Date(issuedTo);
  issuedFrom.setDate(issuedFrom.getDate() - days + 1);

  return {
    issuedFrom: toDateInputValue(issuedFrom),
    issuedTo: toDateInputValue(issuedTo),
  };
}

function formatPeriodDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day))
  );
}

export default function OperationsDashboardPage() {
  const { selectedEntityId, activeEntity } = useAuth();
  const [periodPreset, setPeriodPreset] =
    useState<DashboardPeriodPreset>("30");
  const [period, setPeriod] = useState<DashboardPeriod>(() =>
    buildLastDaysPeriod(30)
  );
  const [customPeriod, setCustomPeriod] = useState<DashboardPeriod>(() =>
    buildLastDaysPeriod(30)
  );
  const {
    dashboard,
    isFetchingDashboard,
    isError,
    refetch,
  } = useOperationsDashboard(
    selectedEntityId ?? "",
    Boolean(selectedEntityId),
    period
  );
  const isCustomPeriodValid = Boolean(
    customPeriod.issuedFrom &&
      customPeriod.issuedTo &&
      customPeriod.issuedFrom <= customPeriod.issuedTo
  );

  function handlePeriodPreset(value: string) {
    const nextPreset = value as DashboardPeriodPreset;
    setPeriodPreset(nextPreset);

    if (nextPreset === "CUSTOM") {
      setCustomPeriod(period);
      return;
    }

    setPeriod(buildLastDaysPeriod(Number(nextPreset)));
  }

  function applyCustomPeriod() {
    if (!isCustomPeriodValid) return;
    setPeriod(customPeriod);
  }

  function buildOrdersHref(operationalStatus?: string) {
    const params = new URLSearchParams({
      lifecycleStatus: "ACTIVE",
      issuedFrom: period.issuedFrom,
      issuedTo: period.issuedTo,
    });

    if (operationalStatus) {
      params.set("operationalStatus", operationalStatus);
    }

    return `/orders?${params.toString()}`;
  }

  if (isFetchingDashboard && !dashboard) {
    return (
      <div className="p-4 lg:p-6">
        <Card>
          <CardContent className="py-12 text-sm text-muted-foreground">
            Montando o painel operacional...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !dashboard) {
    return (
      <div className="p-4 lg:p-6">
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col items-start gap-4 py-10">
            <p className="font-semibold">
              Nao foi possivel carregar o painel.
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { operational, financial, receivables } = dashboard;

  return (
    <div className="flex flex-col gap-6 px-4 py-5 lg:px-6 lg:py-7">
      <section className="relative overflow-hidden rounded-3xl border bg-[radial-gradient(circle_at_85%_15%,rgba(16,185,129,0.24),transparent_30%),radial-gradient(circle_at_10%_90%,rgba(14,165,233,0.12),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.05),transparent)] p-6 sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-emerald-300">
            Centro operacional
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
            {activeEntity?.name || "Sua operacao"}, do pedido ao pagamento.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            As pendencias abaixo seguem o fluxo real das ordens e mostram
            exatamente onde a equipe precisa agir agora.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/orders/new">
                Nova ordem
                <IconArrowRight />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/orders">Ver todas as ordens</Link>
            </Button>
          </div>
        </div>
        <IconBuildingWarehouse className="absolute -bottom-10 -right-8 size-56 rotate-[-8deg] text-emerald-400/[0.06]" />
      </section>

      <section className="rounded-2xl border bg-card/70 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
              <IconCalendar className="size-5" />
            </span>
            <div>
              <p className="font-semibold">Periodo analisado</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ordens emitidas de {formatPeriodDate(period.issuedFrom)} ate{" "}
                {formatPeriodDate(period.issuedTo)}.
              </p>
              {isFetchingDashboard && (
                <p
                  className="mt-2 flex items-center gap-1.5 text-xs text-emerald-300"
                  aria-live="polite"
                >
                  <IconLoader2 className="size-3.5 animate-spin" />
                  Atualizando indicadores...
                </p>
              )}
            </div>
          </div>
          <Select value={periodPreset} onValueChange={handlePeriodPreset}>
            <SelectTrigger className="w-full lg:w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Ultimos 7 dias</SelectItem>
              <SelectItem value="15">Ultimos 15 dias</SelectItem>
              <SelectItem value="30">Ultimos 30 dias</SelectItem>
              <SelectItem value="CUSTOM">Periodo personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {periodPreset === "CUSTOM" && (
          <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
            <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
              Data inicial
              <Input
                type="date"
                value={customPeriod.issuedFrom}
                max={customPeriod.issuedTo || undefined}
                onChange={(event) =>
                  setCustomPeriod((current) => ({
                    ...current,
                    issuedFrom: event.target.value,
                  }))
                }
                className="[color-scheme:dark]"
              />
            </label>
            <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
              Data final
              <Input
                type="date"
                value={customPeriod.issuedTo}
                min={customPeriod.issuedFrom || undefined}
                onChange={(event) =>
                  setCustomPeriod((current) => ({
                    ...current,
                    issuedTo: event.target.value,
                  }))
                }
                className="[color-scheme:dark]"
              />
            </label>
            <Button
              disabled={!isCustomPeriodValid || isFetchingDashboard}
              onClick={applyCustomPeriod}
            >
              Aplicar periodo
            </Button>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <IconFileInvoice className="size-5 text-emerald-400" />
          <div>
            <h2 className="text-lg font-semibold">Visao geral da operacao</h2>
            <p className="text-sm text-muted-foreground">
              Quantidades operacionais e resultado financeiro das ordens ativas
              emitidas no periodo selecionado.
              Clique em um indicador operacional para abrir suas ordens em
              outra aba.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <FlowCard
            label="Ordens ativas"
            value={operational.activeOrders}
            icon={IconChartBar}
            href={buildOrdersHref()}
          />
          <FlowCard
            label="Comprar"
            value={operational.pendingPurchaseOrders}
            icon={IconShoppingCart}
            tone="amber"
            href={buildOrdersHref("PENDING_PURCHASE")}
          />
          <FlowCard
            label="Aguardando chegada"
            value={operational.awaitingReceiptOrders}
            icon={IconPackageImport}
            tone="sky"
            href={buildOrdersHref("AWAITING_RECEIPT")}
          />
          <FlowCard
            label="Prontas para entrega"
            value={operational.readyForDeliveryOrders}
            icon={IconPackageExport}
            tone="emerald"
            href={buildOrdersHref("READY_FOR_DELIVERY")}
          />
          <FlowCard
            label="Em entrega"
            value={operational.inDeliveryOrders}
            icon={IconTruckDelivery}
            href={buildOrdersHref("IN_DELIVERY")}
          />
          <FlowCard
            label="Atrasadas"
            value={operational.delayedOrders}
            icon={IconClockExclamation}
            tone="red"
            href={buildOrdersHref("DELAYED")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MoneyCard
            label="Valor contratado"
            value={financial.contractedRevenue}
            description="Soma do valor oficial das ordens ativas emitidas no periodo."
          />
          <MoneyCard
            label="Custo operacional"
            value={
              financial.acquisitionCost +
              financial.deliveryCost +
              financial.taxCost +
              financial.otherDeductions
            }
            description="Compras, fretes, impostos e demais deducoes registradas."
          />
          <MoneyCard
            label="Receita recebida"
            value={financial.receivedRevenue}
            description="Pagamentos dos clientes que ja foram confirmados."
            tone="emerald"
          />
          <MoneyCard
            label="Margem projetada"
            value={financial.projectedMargin}
            description="Cenario otimista: valor contratado menos os custos conhecidos ate agora."
            tone={financial.projectedMargin < 0 ? "red" : "emerald"}
          />
          <MoneyCard
            label="Margem com custo conhecido"
            value={financial.knownCostMargin ?? 0}
            description={`Venda ja coberta por compras: ${formatCurrency(financial.costCoveredRevenue ?? 0)}, menos os custos registrados.`}
            tone={(financial.knownCostMargin ?? 0) < 0 ? "red" : "emerald"}
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle>Radar de atencao</CardTitle>
            <CardDescription>
              Ordens atrasadas e etapas que ainda exigem acao.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {!dashboard.attentionOrders.length && (
              <div className="px-5 py-12 text-center">
                <p className="font-medium">Nenhuma pendencia operacional</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Nenhuma ordem do periodo exige acompanhamento agora.
                </p>
              </div>
            )}
            {dashboard.attentionOrders.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="grid gap-4 border-b p-4 transition-colors last:border-b-0 hover:bg-muted/30 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">Ordem {order.orderNumber}</p>
                    {order.delayed && (
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-300">
                        Atrasada
                      </span>
                    )}
                    <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-xs text-sky-300">
                      {progressLabels[order.progress]}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {order.customerName} - entrega{" "}
                    {formatDate(order.requestedDeliveryAt)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {order.pendingPurchaseItems > 0 && (
                      <span>{order.pendingPurchaseItems} para comprar</span>
                    )}
                    {order.awaitingReceiptItems > 0 && (
                      <span>{order.awaitingReceiptItems} aguardando chegada</span>
                    )}
                    {order.readyForDeliveryItems > 0 && (
                      <span>{order.readyForDeliveryItems} para entregar</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  {order.receivableBalance > 0 && (
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-muted-foreground">
                        A receber
                      </p>
                      <p className="font-semibold text-amber-300">
                        {formatCurrency(order.receivableBalance)}
                      </p>
                    </div>
                  )}
                  <IconArrowRight className="size-5 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-emerald-500/15 bg-emerald-500/[0.025]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconCashBanknote className="size-5 text-emerald-400" />
              Contas a receber
            </CardTitle>
            <CardDescription>
              Carteira global de notas emitidas, independente do periodo acima.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BigValue
              label={`${receivables.openCount} titulos em aberto`}
              value={receivables.openTotal}
            />
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <SmallValue
                label={`${receivables.overdueCount} vencidos`}
                value={receivables.overdueTotal}
                tone="red"
              />
              <SmallValue
                label={`${receivables.dueTodayCount} vencem hoje`}
                value={receivables.dueTodayTotal}
                tone="amber"
              />
              <SmallValue
                label={`${receivables.dueNext7DaysCount} nos proximos 7 dias`}
                value={receivables.dueNext7DaysTotal}
                tone="sky"
              />
            </div>
            {receivables.overdueCount > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-100">
                <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
                Existem recebimentos vencidos que precisam de acompanhamento.
              </div>
            )}
            <Button className="w-full" variant="outline" asChild>
              <Link to="/receivables">
                Acompanhar contas a receber <IconArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

    </div>
  );
}

type IconComponent = React.ComponentType<{ className?: string }>;

function FlowCard({
  label,
  value,
  icon: Icon,
  href,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: IconComponent;
  href: string;
  tone?: "default" | "amber" | "sky" | "emerald" | "red";
}) {
  const tones = {
    default: "text-foreground bg-muted/50",
    amber: "text-amber-300 bg-amber-500/10",
    sky: "text-sky-300 bg-sky-500/10",
    emerald: "text-emerald-300 bg-emerald-500/10",
    red: "text-red-300 bg-red-500/10",
  };

  return (
    <Link
      to={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label}: ${value} ordens. Abrir em nova aba.`}
      className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
    >
      <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-emerald-400/35 group-hover:bg-muted/20 group-hover:shadow-lg">
        <CardContent className="flex items-center justify-between gap-3 py-5">
          <div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {label}
              <IconExternalLink className="size-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
            </p>
            <p className="mt-1 text-3xl font-semibold">{value}</p>
          </div>
          <span
            className={`flex size-10 items-center justify-center rounded-xl ${tones[tone]}`}
          >
            <Icon className="size-5" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

function BigValue({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-black/10 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-emerald-300">
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function SmallValue({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "red" | "amber" | "sky";
}) {
  return (
    <div className="rounded-xl border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 font-semibold ${
          tone === "red"
            ? "text-red-300"
            : tone === "sky"
              ? "text-sky-300"
              : "text-amber-300"
        }`}
      >
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function MoneyCard({
  label,
  value,
  description,
  tone = "default",
}: {
  label: string;
  value: number;
  description: string;
  tone?: "default" | "emerald" | "red";
}) {
  const valueClass =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "red"
        ? "text-red-300"
        : "";

  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className={`mt-2 text-2xl font-semibold ${valueClass}`}>
          {formatCurrency(value)}
        </p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
