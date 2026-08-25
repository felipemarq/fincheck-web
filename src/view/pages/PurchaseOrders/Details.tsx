import {
  IconAlertTriangle,
  IconArrowLeft,
  IconBuildingHospital,
  IconCashBanknote,
  IconCalendar,
  IconEdit,
  IconFileInvoice,
  IconFileTypePdf,
  IconFilter,
  IconMapPin,
  IconPackage,
  IconPackageExport,
  IconPackageImport,
  IconReceipt,
  IconShoppingCart,
  IconTruck,
} from "@tabler/icons-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import type { Acquisition } from "@/app/entities/Acquisition";
import type { Delivery } from "@/app/entities/Delivery";
import type {
  Invoice,
  ReceivablePayment,
} from "@/app/entities/Invoice";
import { useAcquisitions } from "@/app/hooks/useAcquisitions";
import { useAuth } from "@/app/hooks/useAuth";
import { useDeliveries } from "@/app/hooks/useDeliveries";
import { useInvoices } from "@/app/hooks/useInvoices";
import { usePurchaseOrder } from "@/app/hooks/usePurchaseOrder";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AcquisitionModal } from "@/view/modals/AcquisitionModal";
import { AcquisitionReceiptModal } from "@/view/modals/AcquisitionReceiptModal";
import { DeliveryModal } from "@/view/modals/DeliveryModal";
import { InvoiceModal } from "@/view/modals/InvoiceModal";
import { ReceivablePaymentModal } from "@/view/modals/ReceivablePaymentModal";
import { exportPurchaseOrderPdf } from "./exportPurchaseOrderPdf";
import {
  formatCurrency,
  formatDate,
  lifecycleClass,
  lifecycleLabels,
  progressLabels,
} from "./purchaseOrderPresentation";

const acquisitionStatusLabels = {
  PLACED: "Compra realizada",
  IN_TRANSIT: "Em transporte",
  PARTIALLY_RECEIVED: "Recebida parcialmente",
  RECEIVED: "Recebida",
  CANCELLED: "Cancelada",
} satisfies Record<Acquisition["status"], string>;

function acquisitionStatusClass(status: Acquisition["status"]) {
  if (status === "CANCELLED") {
    return "bg-red-500/10 text-red-300";
  }

  if (status === "RECEIVED") {
    return "bg-emerald-500/10 text-emerald-300";
  }

  if (status === "IN_TRANSIT" || status === "PARTIALLY_RECEIVED") {
    return "bg-sky-500/10 text-sky-300";
  }

  return "bg-amber-500/10 text-amber-300";
}

const deliveryStatusLabels = {
  PREPARING: "Em preparacao",
  DISPATCHED: "Em deslocamento",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelada",
} satisfies Record<Delivery["status"], string>;

const invoiceStatusLabels = {
  DRAFT: "Rascunho",
  ISSUED: "Emitida",
  CANCELLED: "Cancelada",
} satisfies Record<Invoice["status"], string>;

const receivableStatusLabels = {
  NOT_ISSUED: "Ainda nao emitida",
  OPEN: "Em aberto",
  OVERDUE: "Vencida",
  PARTIALLY_RECEIVED: "Recebida parcialmente",
  RECEIVED: "Recebida",
  CANCELLED: "Cancelada",
} satisfies Record<Invoice["receivableStatus"], string>;

function statusClass(status: string) {
  if (
    status === "DELIVERED" ||
    status === "RECEIVED" ||
    status === "CONFIRMED"
  ) {
    return "bg-emerald-500/10 text-emerald-300";
  }

  if (
    status === "CANCELLED" ||
    status === "OVERDUE"
  ) {
    return "bg-red-500/10 text-red-300";
  }

  if (
    status === "DISPATCHED" ||
    status === "PARTIALLY_RECEIVED" ||
    status === "ISSUED"
  ) {
    return "bg-sky-500/10 text-sky-300";
  }

  return "bg-amber-500/10 text-amber-300";
}

function formatQuantity(value: number) {
  return value.toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
  });
}

const itemFilters = [
  { value: "ALL", label: "Todos" },
  { value: "PENDING_PURCHASE", label: "Falta comprar" },
  { value: "PURCHASED", label: "Comprados" },
  { value: "RECEIVED", label: "Recebidos" },
  { value: "EXCESS", label: "Excedente" },
] as const;

type ItemFilter = (typeof itemFilters)[number]["value"];

function matchesItemFilter(
  item: {
    purchasePendingQuantity: number;
    acquiredQuantity: number;
    receivedQuantity: number;
    excessQuantity: number;
  },
  filter: ItemFilter
) {
  if (filter === "PENDING_PURCHASE") {
    return item.purchasePendingQuantity > 0;
  }

  if (filter === "PURCHASED") {
    return item.acquiredQuantity > 0;
  }

  if (filter === "RECEIVED") {
    return item.receivedQuantity > 0;
  }

  if (filter === "EXCESS") {
    return item.excessQuantity > 0;
  }

  return true;
}

export default function PurchaseOrderDetails() {
  const { purchaseOrderId = "" } = useParams();
  const { activeEntity, selectedEntityId } = useAuth();
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isAcquisitionModalOpen, setIsAcquisitionModalOpen] =
    useState(false);
  const [selectedAcquisition, setSelectedAcquisition] =
    useState<Acquisition | null>(null);
  const [initialPurchaseOrderItemId, setInitialPurchaseOrderItemId] =
    useState<string | null>(null);
  const [receiptAcquisition, setReceiptAcquisition] =
    useState<Acquisition | null>(null);
  const [selectedDelivery, setSelectedDelivery] =
    useState<Delivery | null>(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [initialDeliveryItemId, setInitialDeliveryItemId] =
    useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] =
    useState<Invoice | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [initialInvoiceItemId, setInitialInvoiceItemId] =
    useState<string | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(
    null
  );
  const [selectedPayment, setSelectedPayment] =
    useState<ReceivablePayment | null>(null);
  const [itemFilter, setItemFilter] = useState<ItemFilter>("ALL");

  const { order, isFetchingOrder, isError, refetch } = usePurchaseOrder(
    {
      entityId: selectedEntityId ?? "",
      purchaseOrderId,
    },
    Boolean(selectedEntityId && purchaseOrderId)
  );
  const {
    acquisitions,
    isFetchingAcquisitions,
    isError: isAcquisitionError,
    refetch: refetchAcquisitions,
  } = useAcquisitions(
    {
      entityId: selectedEntityId ?? "",
      purchaseOrderId,
    },
    Boolean(selectedEntityId && purchaseOrderId && order)
  );
  const {
    deliveries,
    isFetchingDeliveries,
    isError: isDeliveryError,
    refetch: refetchDeliveries,
  } = useDeliveries(
    {
      entityId: selectedEntityId ?? "",
      purchaseOrderId,
    },
    Boolean(selectedEntityId && purchaseOrderId && order)
  );
  const {
    invoices,
    isFetchingInvoices,
    isError: isInvoiceError,
    refetch: refetchInvoices,
  } = useInvoices(
    {
      entityId: selectedEntityId ?? "",
      purchaseOrderId,
    },
    Boolean(selectedEntityId && purchaseOrderId && order)
  );

  const openNewAcquisition = (purchaseOrderItemId?: string) => {
    setSelectedAcquisition(null);
    setInitialPurchaseOrderItemId(purchaseOrderItemId ?? null);
    setIsAcquisitionModalOpen(true);
  };

  const openAcquisition = (acquisition: Acquisition) => {
    setInitialPurchaseOrderItemId(null);
    setSelectedAcquisition(acquisition);
    setIsAcquisitionModalOpen(true);
  };

  const closeAcquisitionModal = () => {
    setIsAcquisitionModalOpen(false);
    setSelectedAcquisition(null);
    setInitialPurchaseOrderItemId(null);
  };

  const openDelivery = (
    delivery?: Delivery,
    purchaseOrderItemId?: string
  ) => {
    setSelectedDelivery(delivery ?? null);
    setInitialDeliveryItemId(purchaseOrderItemId ?? null);
    setIsDeliveryModalOpen(true);
  };

  const closeDelivery = () => {
    setIsDeliveryModalOpen(false);
    setSelectedDelivery(null);
    setInitialDeliveryItemId(null);
  };

  const openInvoice = (
    invoice?: Invoice,
    purchaseOrderItemId?: string
  ) => {
    setSelectedInvoice(invoice ?? null);
    setInitialInvoiceItemId(purchaseOrderItemId ?? null);
    setIsInvoiceModalOpen(true);
  };

  const closeInvoice = () => {
    setIsInvoiceModalOpen(false);
    setSelectedInvoice(null);
    setInitialInvoiceItemId(null);
  };

  const openPayment = (
    invoice: Invoice,
    payment?: ReceivablePayment
  ) => {
    setPaymentInvoice(invoice);
    setSelectedPayment(payment ?? null);
  };

  const closePayment = () => {
    setPaymentInvoice(null);
    setSelectedPayment(null);
  };

  const handleExportPdf = async () => {
    if (!order || isExportingPdf) {
      return;
    }

    setIsExportingPdf(true);

    try {
      await exportPurchaseOrderPdf(order, activeEntity?.name);
      toast.success("PDF da ordem exportado.");
    } catch (error) {
      console.error("Failed to export purchase order PDF", error);
      toast.error("Não foi possível gerar o PDF desta ordem.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (isFetchingOrder) {
    return (
      <div className="p-4 lg:p-6">
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            Carregando ordem...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="p-4 lg:p-6">
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col items-start gap-4 py-10">
            <p className="font-semibold">Ordem nao encontrada.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => refetch()}>
                Tentar novamente
              </Button>
              <Button asChild>
                <Link to="/orders">Voltar para ordens</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canOperate = order.lifecycleStatus === "ACTIVE";
  const invoiceableItems = order.items.filter(
    (item) => item.invoicePendingQuantity > 0
  );
  const registeredInvoiceCount = invoices?.length ?? order.invoiceCount;
  const hasRegisteredInvoices = registeredInvoiceCount > 0;
  const filteredItems = order.items.filter((item) =>
    matchesItemFilter(item, itemFilter)
  );
  const itemFilterCounts = {
    ALL: order.items.length,
    PENDING_PURCHASE: order.items.filter((item) =>
      matchesItemFilter(item, "PENDING_PURCHASE")
    ).length,
    PURCHASED: order.items.filter((item) =>
      matchesItemFilter(item, "PURCHASED")
    ).length,
    RECEIVED: order.items.filter((item) =>
      matchesItemFilter(item, "RECEIVED")
    ).length,
    EXCESS: order.items.filter((item) =>
      matchesItemFilter(item, "EXCESS")
    ).length,
  } satisfies Record<ItemFilter, number>;

  return (
    <>
      <div className="flex flex-col gap-6 px-4 py-5 lg:px-6 lg:py-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" className="w-fit" asChild>
            <Link to="/orders">
              <IconArrowLeft />
              Todas as ordens
            </Link>
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              isLoading={isExportingPdf}
              onClick={handleExportPdf}
              aria-label="Exportar ordem completa em PDF"
            >
              <IconFileTypePdf />
              {isExportingPdf ? "Gerando PDF" : "Exportar PDF"}
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/orders/${order.id}/edit`}>
                <IconEdit />
                Editar ordem
              </Link>
            </Button>
            {canOperate && (
              <Button onClick={() => openNewAcquisition()}>
                <IconShoppingCart />
                Registrar compra
              </Button>
            )}
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent)] p-5 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${lifecycleClass(
                    order.lifecycleStatus
                  )}`}
                >
                  {lifecycleLabels[order.lifecycleStatus]}
                </span>
                <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-300">
                  {progressLabels[order.progress]}
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {order.customer.tradeName || order.customer.legalName}
                </p>
                <h2 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Ordem {order.orderNumber}
                </h2>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-400/15 bg-black/10 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Valor contratado
              </p>
              <p className="mt-2 text-3xl font-semibold text-emerald-300">
                {formatCurrency(order.officialTotal)}
              </p>
            </div>
          </div>
        </section>

        {order.hasTotalMismatch && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/5 p-4 text-amber-100">
            <IconAlertTriangle className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-medium">
                Divergencia de total preservada
              </p>
              <p className="mt-1 text-sm text-amber-100/70">
                O documento informa {formatCurrency(order.officialTotal)}, mas
                a soma das linhas e{" "}
                {formatCurrency(order.calculatedItemsTotal)}.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard
            label="Custo de compras"
            value={formatCurrency(order.knownAcquisitionCost)}
            tone="emerald"
          />
          <MetricCard
            label="Fretes de entrega"
            value={formatCurrency(order.deliveryCost)}
          />
          <MetricCard
            label="Faturado"
            value={formatCurrency(order.invoicedRevenue)}
          />
          <MetricCard
            label="Recebido"
            value={formatCurrency(order.receivedRevenue)}
            tone="emerald"
          />
          <MetricCard
            label="A receber"
            value={formatCurrency(order.receivableBalance)}
            tone={order.receivableBalance > 0 ? "amber" : "default"}
          />
          <MetricCard
            label="Margem projetada"
            value={formatCurrency(order.projectedMargin)}
            tone={order.projectedMargin < 0 ? "amber" : "default"}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Dados comerciais</CardTitle>
              <CardDescription>
                Identificadores e datas copiados da ordem do cliente.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
              <Info label="Emissao" value={formatDate(order.issuedAt)} />
              <Info
                label="Entrega solicitada"
                value={formatDate(order.requestedDeliveryAt)}
              />
              <Info label="Numero externo" value={order.externalNumber} />
              <Info label="Cotacao" value={order.quoteNumber} />
              <Info label="Requisicao" value={order.requisitionNumber} />
              <Info
                label="Condicao de pagamento"
                value={order.paymentTerms}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconBuildingHospital className="size-5 text-emerald-400" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="font-medium">{order.customer.legalName}</p>
              <p className="text-muted-foreground">
                {order.customer.document}
              </p>
              <div className="flex items-start gap-2 border-t pt-3 text-muted-foreground">
                <IconMapPin className="mt-0.5 size-4 shrink-0" />
                <span>
                  {order.deliveryAddress || "Entrega nao informada"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Itens da ordem</CardTitle>
                <CardDescription className="mt-1">
                  {order.itemCount}{" "}
                  {order.itemCount === 1 ? "linha" : "linhas"} no documento.
                </CardDescription>
              </div>
              <IconPackage className="size-6 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border bg-muted/10 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <IconFilter className="size-4 text-emerald-400" />
                  Filtrar itens
                </div>
                <p className="text-xs text-muted-foreground">
                  Exibindo {filteredItems.length} de {order.items.length}
                </p>
              </div>
              <div
                className="mt-3 flex flex-wrap gap-2"
                role="group"
                aria-label="Filtrar itens da ordem"
              >
                {itemFilters.map((filter) => (
                  <Button
                    key={filter.value}
                    type="button"
                    size="sm"
                    variant={
                      itemFilter === filter.value ? "secondary" : "outline"
                    }
                    aria-pressed={itemFilter === filter.value}
                    onClick={() => setItemFilter(filter.value)}
                  >
                    {filter.label}
                    <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[11px] tabular-nums">
                      {itemFilterCounts[filter.value]}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            {filteredItems.map((item) => (
              <div
                key={item.id ?? item.lineNumber}
                className="grid gap-4 rounded-xl border bg-muted/15 p-4 md:grid-cols-[auto_1fr_auto]"
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-sm font-semibold text-emerald-400">
                  {item.lineNumber}
                </span>
                <div className="min-w-0">
                  <p className="font-medium">{item.description}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.brand}
                    {item.specification ? ` - ${item.specification}` : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">
                      Pedido: {formatQuantity(item.orderedQuantity)}{" "}
                      {item.originalUnit}
                    </span>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-300">
                      Comprado: {formatQuantity(item.acquiredQuantity)}
                    </span>
                    <span className="rounded-full bg-sky-500/10 px-2 py-1 text-sky-300">
                      Recebido: {formatQuantity(item.receivedQuantity)}
                    </span>
                    {item.committedDeliveryQuantity > 0 && (
                      <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-cyan-300">
                        Em lotes:{" "}
                        {formatQuantity(item.committedDeliveryQuantity)}
                      </span>
                    )}
                    {item.deliveredQuantity > 0 && (
                      <span className="rounded-full bg-teal-500/10 px-2 py-1 text-teal-300">
                        Entregue: {formatQuantity(item.deliveredQuantity)}
                      </span>
                    )}
                    {item.invoicedQuantity > 0 && (
                      <span className="rounded-full bg-lime-500/10 px-2 py-1 text-lime-300">
                        Faturado: {formatQuantity(item.invoicedQuantity)}
                      </span>
                    )}
                    {item.purchasePendingQuantity > 0 && (
                      <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-300">
                        Falta comprar:{" "}
                        {formatQuantity(item.purchasePendingQuantity)}
                      </span>
                    )}
                    {item.excessQuantity > 0 && (
                      <span className="rounded-full bg-sky-500/10 px-2 py-1 text-sky-300">
                        Excedente: {formatQuantity(item.excessQuantity)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-start gap-2 md:items-end">
                  <div className="md:text-right">
                    <p className="text-xs text-muted-foreground">
                      Total da linha
                    </p>
                    <p className="mt-1 font-semibold">
                      {formatCurrency(item.officialTotal)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Valor unitario: {formatCurrency(item.saleUnitPrice)} /{" "}
                      {item.originalUnit}
                    </p>
                  </div>
                  <span className="rounded-full bg-sky-500/10 px-2 py-1 text-xs text-sky-300">
                    {progressLabels[item.progress]}
                  </span>
                  {canOperate && item.id && (
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      {item.purchasePendingQuantity > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openNewAcquisition(item.id)}
                        >
                          <IconShoppingCart />
                          Comprar
                        </Button>
                      )}
                      {item.availableForDeliveryQuantity > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDelivery(undefined, item.id)}
                        >
                          <IconPackageExport />
                          Entregar
                        </Button>
                      )}
                      {item.invoicePendingQuantity > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openInvoice(undefined, item.id)}
                        >
                          <IconFileInvoice />
                          Faturar
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filteredItems.length === 0 && (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-8 text-center">
                <IconFilter className="size-6 text-muted-foreground" />
                <div>
                  <p className="font-medium">Nenhum item neste filtro</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Esta ordem nao possui itens com essa situacao no momento.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setItemFilter("ALL")}
                >
                  Mostrar todos
                </Button>
              </div>
            )}

            <div className="flex flex-col gap-2 border-t pt-4 text-sm sm:flex-row sm:items-center sm:justify-end">
              <span className="text-muted-foreground">
                Soma de todas as linhas
              </span>
              <strong className="text-lg">
                {formatCurrency(order.calculatedItemsTotal)}
              </strong>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <IconShoppingCart className="size-5 text-emerald-400" />
                  Aquisicoes
                </CardTitle>
                <CardDescription className="mt-1">
                  Compras realizadas para atender exclusivamente esta ordem.
                </CardDescription>
              </div>
              {canOperate && (
                <Button onClick={() => openNewAcquisition()}>
                  <IconShoppingCart />
                  Registrar compra
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isFetchingAcquisitions && (
              <p className="py-6 text-sm text-muted-foreground">
                Carregando aquisicoes...
              </p>
            )}

            {isAcquisitionError && (
              <div className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 p-4">
                <p className="text-sm">
                  Nao foi possivel carregar as aquisicoes.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetchAcquisitions()}
                >
                  Tentar novamente
                </Button>
              </div>
            )}

            {!isFetchingAcquisitions &&
              !isAcquisitionError &&
              !acquisitions?.length && (
                <div className="rounded-2xl border border-dashed bg-muted/10 px-5 py-10 text-center">
                  <p className="font-medium">
                    Nenhuma compra registrada
                  </p>
                  <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                    Registre a primeira aquisicao para atualizar as
                    quantidades compradas e o custo conhecido da ordem.
                  </p>
                  {canOperate && (
                    <Button
                      className="mt-4"
                      onClick={() => openNewAcquisition()}
                    >
                      Registrar primeira compra
                    </Button>
                  )}
                </div>
              )}

            {acquisitions?.map((acquisition) => {
              const canEdit =
                acquisition.status === "PLACED" ||
                acquisition.status === "IN_TRANSIT";
              const currentItems = acquisition.items.flatMap((item) =>
                item.allocations
                  .filter(
                    (allocation) => allocation.purchaseOrderId === order.id
                  )
                  .map((allocation) => ({ item, allocation }))
              );
              const allocatedTotals = currentItems.reduce(
                (totals, { allocation }) => ({
                  items: totals.items + allocation.itemCost,
                  shipping: totals.shipping + allocation.shippingCost,
                  other: totals.other + allocation.otherExpenses,
                  discount: totals.discount + allocation.generalDiscount,
                }),
                { items: 0, shipping: 0, other: 0, discount: 0 }
              );
              const requiresGroupedEditor =
                acquisition.relatedOrderCount > 1 ||
                acquisition.unallocatedItemCount > 0;

              return (
                <article
                  key={acquisition.id}
                  className="rounded-2xl border bg-muted/10 p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${acquisitionStatusClass(
                            acquisition.status
                          )}`}
                        >
                          {acquisitionStatusLabels[acquisition.status]}
                        </span>
                        {acquisition.channel && (
                          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                            {acquisition.channel}
                          </span>
                        )}
                        {acquisition.relatedOrderCount > 1 && (
                          <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-xs text-sky-300">
                            Compartilhada com {acquisition.relatedOrderCount} ordens
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3 text-lg font-semibold">
                        {acquisition.sellerName || "Vendedor nao informado"}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Compra em {formatDate(acquisition.purchasedAt)}
                        {acquisition.sellerOrderNumber
                          ? ` - pedido ${acquisition.sellerOrderNumber}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-left lg:text-right">
                        <p className="text-xs text-muted-foreground">
                          Custo nesta ordem
                        </p>
                        <p className="mt-1 text-xl font-semibold text-emerald-300">
                          {formatCurrency(
                            acquisition.allocatedCostForCurrentOrder ??
                              acquisition.totalCost
                          )}
                        </p>
                      </div>
                      {canOperate && canEdit && (
                        requiresGroupedEditor ? (
                          <Button size="sm" variant="outline" asChild>
                            <Link to={`/purchases?edit=${acquisition.id}`}>
                              <IconEdit /> Editar pedido
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAcquisition(acquisition)}
                          >
                            <IconEdit />
                            Editar
                          </Button>
                        )
                      )}
                      {canOperate &&
                        acquisition.status !== "CANCELLED" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              setReceiptAcquisition(acquisition)
                            }
                          >
                            <IconPackageImport />
                            Gerir chegadas
                          </Button>
                        )}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <Info
                      label="Responsavel"
                      value={acquisition.buyerName}
                    />
                    <Info
                      label="Pagamento"
                      value={acquisition.paymentMethod}
                    />
                    <Info
                      label="Identificacao"
                      value={acquisition.paymentInstrument}
                    />
                    <Info
                      label="Titular"
                      value={acquisition.paymentHolder}
                    />
                  </div>

                  <div className="mt-4 space-y-2 border-t pt-4">
                    {currentItems.map(({ item, allocation }) => (
                      <div
                        key={`${item.id}:${allocation.purchaseOrderItemId}`}
                        className="flex flex-col gap-2 rounded-xl bg-background/40 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium">
                            {allocation.lineNumber}. {item.description}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatQuantity(allocation.allocatedQuantity)}{" "}
                            {allocation.originalUnit} - custo unitario{" "}
                            {formatCurrency(item.costUnitPrice)}
                          </p>
                        </div>
                        <p className="font-semibold">
                          {formatCurrency(allocation.totalCost)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
                    <span>
                      Produtos: {formatCurrency(allocatedTotals.items)}
                    </span>
                    <span>
                      Frete rateado: {formatCurrency(allocatedTotals.shipping)}
                    </span>
                    <span>
                      Outras despesas:{" "}
                      {formatCurrency(allocatedTotals.other)}
                    </span>
                    <span>
                      Desconto geral:{" "}
                      {formatCurrency(allocatedTotals.discount)}
                    </span>
                  </div>
                </article>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <IconPackageExport className="size-5 text-emerald-400" />
                  Entregas
                </CardTitle>
                <CardDescription className="mt-1">
                  Lotes preparados e entregues ao cliente.
                </CardDescription>
              </div>
              {canOperate &&
                order.items.some(
                  (item) => item.availableForDeliveryQuantity > 0
                ) && (
                  <Button onClick={() => openDelivery()}>
                    <IconTruck />
                    Nova entrega
                  </Button>
                )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isFetchingDeliveries && (
              <p className="py-6 text-sm text-muted-foreground">
                Carregando entregas...
              </p>
            )}
            {isDeliveryError && (
              <div className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 p-4">
                <p className="text-sm">
                  Nao foi possivel carregar as entregas.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetchDeliveries()}
                >
                  Tentar novamente
                </Button>
              </div>
            )}
            {!isFetchingDeliveries &&
              !isDeliveryError &&
              !deliveries?.length && (
                <EmptyState
                  title="Nenhuma entrega criada"
                  description="Quando os itens chegarem, separe o primeiro lote para entrega ao cliente."
                />
              )}

            {deliveries?.map((delivery) => (
              <article
                key={delivery.id}
                className="rounded-2xl border bg-muted/10 p-4 sm:p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(
                        delivery.status
                      )}`}
                    >
                      {deliveryStatusLabels[delivery.status]}
                    </span>
                    <h3 className="mt-3 text-lg font-semibold">
                      Lote com {formatQuantity(delivery.totalQuantity)}{" "}
                      unidades
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Saida: {formatDate(delivery.dispatchedAt)} - Entrega:{" "}
                      {formatDate(delivery.deliveredAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Frete
                      </p>
                      <p className="font-semibold">
                        {delivery.freightCost > 0
                          ? formatCurrency(delivery.freightCost)
                          : "Sem custo"}
                      </p>
                    </div>
                    {canOperate && delivery.status !== "CANCELLED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDelivery(delivery)}
                      >
                        <IconEdit />
                        Editar
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-2 border-t pt-4">
                  {delivery.items.map((item) => (
                    <OperationItem
                      key={item.id ?? item.purchaseOrderItemId}
                      title={`${item.lineNumber}. ${item.description}`}
                      detail={`${formatQuantity(item.deliveredQuantity)} ${item.originalUnit}`}
                      value={item.notes}
                    />
                  ))}
                </div>
              </article>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <IconFileInvoice className="size-5 text-emerald-400" />
                  Faturamento e recebimentos
                </CardTitle>
                <CardDescription className="mt-1">
                  Uma ordem pode possuir varias notas. Cada documento usa
                  somente o saldo entregue que ainda nao foi faturado.
                </CardDescription>
              </div>
              {canOperate && (
                <div className="sm:text-right">
                  <Button
                    disabled={!invoiceableItems.length || isFetchingInvoices}
                    onClick={() => openInvoice()}
                    title={
                      invoiceableItems.length
                        ? undefined
                        : "Registre uma nova entrega para liberar itens para faturamento."
                    }
                  >
                    <IconFileInvoice />
                    {hasRegisteredInvoices
                      ? "Adicionar outra nota"
                      : "Registrar primeira nota"}
                  </Button>
                  <p className="mt-2 max-w-xs text-xs text-muted-foreground">
                    {invoiceableItems.length
                      ? `${invoiceableItems.length} item(ns) disponivel(is) para uma nova nota.`
                      : hasRegisteredInvoices
                        ? "A proxima nota sera liberada depois que houver uma nova entrega sem faturamento."
                        : "Registre uma entrega para liberar a primeira nota."}
                  </p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-muted/10 p-3">
                <p className="text-xs text-muted-foreground">
                  Notas registradas
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {registeredInvoiceCount}
                </p>
              </div>
              <div className="rounded-xl border bg-muted/10 p-3">
                <p className="text-xs text-muted-foreground">
                  Itens para nova nota
                </p>
                <p className="mt-1 text-xl font-semibold text-sky-300">
                  {invoiceableItems.length}
                </p>
              </div>
              <div className="rounded-xl border bg-muted/10 p-3">
                <p className="text-xs text-muted-foreground">
                  Faturamento acumulado
                </p>
                <p className="mt-1 text-xl font-semibold text-emerald-300">
                  {formatCurrency(order.invoicedRevenue)}
                </p>
              </div>
            </div>

            {isFetchingInvoices && (
              <p className="py-6 text-sm text-muted-foreground">
                Carregando notas fiscais...
              </p>
            )}
            {isInvoiceError && (
              <div className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 p-4">
                <p className="text-sm">
                  Nao foi possivel carregar as notas fiscais.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetchInvoices()}
                >
                  Tentar novamente
                </Button>
              </div>
            )}
            {!isFetchingInvoices &&
              !isInvoiceError &&
              !invoices?.length && (
                <EmptyState
                  title="Nenhuma nota fiscal registrada"
                  description="Crie uma entrega para liberar os itens que podem ser faturados."
                />
              )}

            {invoices?.map((invoice, index) => (
              <article
                key={invoice.id}
                className="rounded-2xl border bg-muted/10 p-4 sm:p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-300">
                        Documento {index + 1} de {invoices.length}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(
                          invoice.status
                        )}`}
                      >
                        {invoiceStatusLabels[invoice.status]}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(
                          invoice.receivableStatus
                        )}`}
                      >
                        {receivableStatusLabels[invoice.receivableStatus]}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold">
                      Nota {invoice.invoiceNumber}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Emitida em {formatDate(invoice.issuedAt)} - vence em{" "}
                      {formatDate(invoice.dueAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {canOperate &&
                      invoice.status !== "CANCELLED" &&
                      invoice.status === "ISSUED" &&
                      invoice.outstandingAmount > 0 && (
                        <Button
                          size="sm"
                          onClick={() => openPayment(invoice)}
                        >
                          <IconCashBanknote />
                          Receber
                        </Button>
                      )}
                    {canOperate && invoice.status !== "CANCELLED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openInvoice(invoice)}
                      >
                        <IconEdit />
                        Editar nota
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <FinanceValue
                    label="Bruto"
                    value={invoice.grossAmount}
                  />
                  <FinanceValue
                    label="Impostos"
                    value={invoice.taxAmount}
                  />
                  <FinanceValue
                    label="A receber"
                    value={invoice.netReceivableAmount}
                  />
                  <FinanceValue
                    label="Recebido"
                    value={invoice.receivedAmount}
                    tone="emerald"
                  />
                  <FinanceValue
                    label="Saldo"
                    value={invoice.outstandingAmount}
                    tone={
                      invoice.outstandingAmount > 0 ? "amber" : "default"
                    }
                  />
                </div>

                <div className="mt-4 space-y-2 border-t pt-4">
                  {invoice.items.map((item) => (
                    <OperationItem
                      key={item.id ?? item.purchaseOrderItemId}
                      title={`${item.lineNumber}. ${item.description}`}
                      detail={`${formatQuantity(item.invoicedQuantity)} ${item.originalUnit} x ${formatCurrency(item.unitPrice)}`}
                      value={formatCurrency(item.totalAmount)}
                    />
                  ))}
                </div>

                {invoice.payments.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Recebimentos
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {invoice.payments.map((payment) => (
                        <button
                          key={payment.id}
                          type="button"
                          disabled={
                            !canOperate ||
                            payment.status === "CANCELLED"
                          }
                          onClick={() => openPayment(invoice, payment)}
                          className="flex items-center justify-between rounded-xl border bg-background/30 p-3 text-left disabled:opacity-50"
                        >
                          <span>
                            <span className="block text-sm font-medium">
                              {formatCurrency(payment.amount)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(payment.receivedAt)} -{" "}
                              {payment.paymentMethod}
                              {payment.status === "CANCELLED"
                                ? " - cancelado"
                                : ""}
                            </span>
                          </span>
                          {payment.status !== "CANCELLED" && (
                            <IconEdit className="size-4" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))}

            {canOperate &&
              hasRegisteredInvoices &&
              invoiceableItems.length > 0 && (
                <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-sky-400/30 bg-sky-500/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">
                      Ha outro lote pronto para faturamento
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Crie uma nota independente para os {invoiceableItems.length}{" "}
                      item(ns) que ainda possuem saldo entregue.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => openInvoice()}>
                    <IconFileInvoice />
                    Criar proxima nota
                  </Button>
                </div>
              )}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconReceipt className="size-5 text-emerald-400" />
                Instrucoes e observacoes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <Info label="Instrucoes" value={order.instructions} />
              <Info label="Observacoes" value={order.notes} />
            </CardContent>
          </Card>

          <Card className="border-dashed bg-emerald-500/[0.03]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconCalendar className="size-5 text-emerald-400" />
                Fechamento financeiro
              </CardTitle>
              <CardDescription>
                Resultado conhecido desta ordem.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
              <Info
                label="Impostos"
                value={formatCurrency(order.taxCost)}
              />
              <Info
                label="Outras deducoes"
                value={formatCurrency(order.otherDeductions)}
              />
              <Info
                label="Margem sobre faturado"
                value={formatCurrency(order.invoicedMargin)}
              />
              <Info
                label="Saldo do cliente"
                value={formatCurrency(order.receivableBalance)}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <AcquisitionModal
        isOpen={isAcquisitionModalOpen}
        onClose={closeAcquisitionModal}
        order={order}
        acquisition={selectedAcquisition}
        initialPurchaseOrderItemId={initialPurchaseOrderItemId}
      />
      <AcquisitionReceiptModal
        isOpen={Boolean(receiptAcquisition)}
        onClose={() => setReceiptAcquisition(null)}
        order={order}
        acquisition={receiptAcquisition}
      />
      <DeliveryModal
        isOpen={isDeliveryModalOpen}
        onClose={closeDelivery}
        order={order}
        delivery={selectedDelivery}
        initialPurchaseOrderItemId={initialDeliveryItemId}
      />
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={closeInvoice}
        order={order}
        invoice={selectedInvoice}
        initialPurchaseOrderItemId={initialInvoiceItemId}
      />
      <ReceivablePaymentModal
        isOpen={Boolean(paymentInvoice)}
        onClose={closePayment}
        purchaseOrderId={order.id}
        invoice={paymentInvoice}
        payment={selectedPayment}
      />
    </>
  );
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "emerald" | "amber";
}) {
  const valueClass =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "amber"
        ? "text-amber-300"
        : "text-foreground";

  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className={`mt-2 text-2xl font-semibold ${valueClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-line font-medium text-foreground">
        {value || "Nao informado"}
      </p>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed bg-muted/10 px-5 py-9 text-center">
      <p className="font-medium">{title}</p>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function OperationItem({
  title,
  detail,
  value,
}: {
  title: string;
  detail: string;
  value?: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-background/40 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </div>
      {value && <p className="text-sm font-medium">{value}</p>}
    </div>
  );
}

function FinanceValue({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "emerald" | "amber";
}) {
  const className =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "amber"
        ? "text-amber-300"
        : "";

  return (
    <div className="rounded-xl border bg-background/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-semibold ${className}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}
