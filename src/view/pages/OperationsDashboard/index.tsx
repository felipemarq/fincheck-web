import {
  IconAlertTriangle,
  IconArrowRight,
  IconBuildingWarehouse,
  IconCashBanknote,
  IconChartBar,
  IconClockExclamation,
  IconFileInvoice,
  IconPackageExport,
  IconPackageImport,
  IconShoppingCart,
  IconTruckDelivery,
} from "@tabler/icons-react";
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
import {
  formatCurrency,
  formatDate,
  progressLabels,
} from "@/view/pages/PurchaseOrders/purchaseOrderPresentation";

export default function OperationsDashboardPage() {
  const { selectedEntityId, activeEntity } = useAuth();
  const {
    dashboard,
    isFetchingDashboard,
    isError,
    refetch,
  } = useOperationsDashboard(
    selectedEntityId ?? "",
    Boolean(selectedEntityId)
  );

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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <FlowCard
          label="Ordens ativas"
          value={operational.activeOrders}
          icon={IconChartBar}
        />
        <FlowCard
          label="Comprar"
          value={operational.pendingPurchaseOrders}
          icon={IconShoppingCart}
          tone="amber"
        />
        <FlowCard
          label="Aguardando chegada"
          value={operational.awaitingReceiptOrders}
          icon={IconPackageImport}
          tone="sky"
        />
        <FlowCard
          label="Prontas para entrega"
          value={operational.readyForDeliveryOrders}
          icon={IconPackageExport}
          tone="emerald"
        />
        <FlowCard
          label="Em entrega"
          value={operational.inDeliveryOrders}
          icon={IconTruckDelivery}
        />
        <FlowCard
          label="Atrasadas"
          value={operational.delayedOrders}
          icon={IconClockExclamation}
          tone="red"
        />
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
                  Todas as ordens ativas estao em dia.
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
              Notas emitidas que ainda possuem saldo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BigValue
              label={`${receivables.openCount} titulos em aberto`}
              value={financial.receivableBalance}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
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
            </div>
            {receivables.overdueCount > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-100">
                <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
                Existem recebimentos vencidos que precisam de acompanhamento.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <IconFileInvoice className="size-5 text-emerald-400" />
          <h2 className="text-lg font-semibold">Resultado da operacao</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MoneyCard
            label="Valor contratado"
            value={financial.contractedRevenue}
          />
          <MoneyCard
            label="Custo operacional"
            value={
              financial.acquisitionCost +
              financial.deliveryCost +
              financial.taxCost +
              financial.otherDeductions
            }
          />
          <MoneyCard
            label="Receita recebida"
            value={financial.receivedRevenue}
            tone="emerald"
          />
          <MoneyCard
            label="Margem projetada"
            value={financial.projectedMargin}
            tone={financial.projectedMargin < 0 ? "red" : "emerald"}
          />
        </div>
      </section>
    </div>
  );
}

type IconComponent = React.ComponentType<{ className?: string }>;

function FlowCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: IconComponent;
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
    <Card>
      <CardContent className="flex items-center justify-between gap-3 py-5">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-semibold">{value}</p>
        </div>
        <span
          className={`flex size-10 items-center justify-center rounded-xl ${tones[tone]}`}
        >
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
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
  tone: "red" | "amber";
}) {
  return (
    <div className="rounded-xl border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 font-semibold ${
          tone === "red" ? "text-red-300" : "text-amber-300"
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
  tone = "default",
}: {
  label: string;
  value: number;
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
      </CardContent>
    </Card>
  );
}
