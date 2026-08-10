import {
  IconAlertTriangle,
  IconArrowRight,
  IconCalendarDue,
  IconChevronLeft,
  IconChevronRight,
  IconClipboardList,
  IconFilterOff,
  IconPackage,
  IconPackageImport,
  IconSearch,
  IconShoppingCart,
} from "@tabler/icons-react";
import { useDeferredValue, useState } from "react";
import { Link } from "react-router-dom";

import type { Acquisition } from "@/app/entities/Acquisition";
import type {
  PurchaseOrderItemDeadlineFilter,
  PurchaseOrderItemProcurementStatus,
  PurchaseOrderItemQueueItem,
  PurchaseOrderItemSort,
} from "@/app/entities/PurchaseOrderItemQueue";
import { useAcquisitions } from "@/app/hooks/useAcquisitions";
import { useAuth } from "@/app/hooks/useAuth";
import { useCustomers } from "@/app/hooks/useCustomers";
import { usePurchaseOrder } from "@/app/hooks/usePurchaseOrder";
import { usePurchaseOrderItems } from "@/app/hooks/usePurchaseOrderItems";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AcquisitionModal } from "@/view/modals/AcquisitionModal";
import { AcquisitionReceiptModal } from "@/view/modals/AcquisitionReceiptModal";
import {
  formatCurrency,
  formatDate,
} from "@/view/pages/PurchaseOrders/purchaseOrderPresentation";

type StatusFilter = PurchaseOrderItemProcurementStatus | "ALL";
type DeadlineFilter = PurchaseOrderItemDeadlineFilter | "ALL";
type OperationTarget = {
  kind: "purchase" | "receipt";
  orderId: string;
  itemId: string;
};

const statusLabels: Record<PurchaseOrderItemProcurementStatus, string> = {
  PENDING_PURCHASE: "Falta comprar",
  PARTIALLY_PURCHASED: "Compra parcial",
  PURCHASED: "Comprado, aguardando chegada",
  PARTIALLY_RECEIVED: "Recebido parcialmente",
  RECEIVED: "Recebido",
};

const statusClasses: Record<PurchaseOrderItemProcurementStatus, string> = {
  PENDING_PURCHASE: "bg-amber-500/10 text-amber-300",
  PARTIALLY_PURCHASED: "bg-orange-500/10 text-orange-300",
  PURCHASED: "bg-sky-500/10 text-sky-300",
  PARTIALLY_RECEIVED: "bg-cyan-500/10 text-cyan-300",
  RECEIVED: "bg-emerald-500/10 text-emerald-300",
};

function formatQuantity(value: number) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

function customerName(item: PurchaseOrderItemQueueItem) {
  return item.customer.tradeName || item.customer.legalName;
}

function deadlineLabel(item: PurchaseOrderItemQueueItem) {
  if (!item.order.requestedDeliveryAt) {
    return "Entrega sem data";
  }

  return `${item.isOverdue ? "Atrasada" : "Entrega"}: ${formatDate(
    item.order.requestedDeliveryAt
  )}`;
}

export default function PurchaseOrderItems() {
  const { selectedEntityId } = useAuth();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [deadline, setDeadline] = useState<DeadlineFilter>("ALL");
  const [customerId, setCustomerId] = useState("ALL");
  const [sort, setSort] = useState<PurchaseOrderItemSort>("URGENCY");
  const [page, setPage] = useState(1);
  const [operationTarget, setOperationTarget] =
    useState<OperationTarget | null>(null);
  const [receiptAcquisition, setReceiptAcquisition] =
    useState<Acquisition | null>(null);

  const {
    items,
    summary,
    pagination,
    isFetchingItems,
    isError,
    refetch,
  } = usePurchaseOrderItems(
    {
      entityId: selectedEntityId ?? "",
      search: deferredSearch || undefined,
      customerId: customerId === "ALL" ? undefined : customerId,
      status: status === "ALL" ? undefined : status,
      deadline: deadline === "ALL" ? undefined : deadline,
      sort,
      page,
      pageSize: 20,
    },
    Boolean(selectedEntityId)
  );
  const { customers } = useCustomers(
    { entityId: selectedEntityId ?? "", active: true },
    Boolean(selectedEntityId)
  );
  const {
    order: operationOrder,
    isFetchingOrder: isFetchingOperationOrder,
    isError: isOperationOrderError,
  } = usePurchaseOrder(
    {
      entityId: selectedEntityId ?? "",
      purchaseOrderId: operationTarget?.orderId ?? "",
    },
    Boolean(selectedEntityId && operationTarget)
  );
  const {
    acquisitions,
    isFetchingAcquisitions,
    isError: isAcquisitionError,
  } = useAcquisitions(
    {
      entityId: selectedEntityId ?? "",
      purchaseOrderId: operationTarget?.orderId ?? "",
    },
    Boolean(
      selectedEntityId &&
        operationTarget?.kind === "receipt" &&
        operationOrder
    )
  );

  const receiptCandidates =
    acquisitions?.filter(
      (acquisition) =>
        acquisition.status !== "CANCELLED" &&
        acquisition.status !== "RECEIVED" &&
        acquisition.items.some((item) =>
          item.allocations.some(
            (allocation) =>
              allocation.purchaseOrderItemId === operationTarget?.itemId
          )
        )
    ) ?? [];
  const hasFilters =
    Boolean(search) ||
    status !== "ALL" ||
    deadline !== "ALL" ||
    customerId !== "ALL" ||
    sort !== "URGENCY";

  const setStatusFilter = (nextStatus: StatusFilter) => {
    setStatus(nextStatus);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("ALL");
    setDeadline("ALL");
    setCustomerId("ALL");
    setSort("URGENCY");
    setPage(1);
  };

  const closeOperation = () => {
    setReceiptAcquisition(null);
    setOperationTarget(null);
  };

  const statusCards: Array<{
    value: StatusFilter;
    label: string;
    count: number;
    accent: string;
  }> = [
    {
      value: "ALL",
      label: "Todos os itens",
      count: summary?.total ?? 0,
      accent: "text-foreground",
    },
    {
      value: "PENDING_PURCHASE",
      label: "Falta comprar",
      count: summary?.pendingPurchase ?? 0,
      accent: "text-amber-300",
    },
    {
      value: "PARTIALLY_PURCHASED",
      label: "Compra parcial",
      count: summary?.partiallyPurchased ?? 0,
      accent: "text-orange-300",
    },
    {
      value: "PURCHASED",
      label: "Aguardando chegada",
      count: summary?.purchased ?? 0,
      accent: "text-sky-300",
    },
    {
      value: "PARTIALLY_RECEIVED",
      label: "Recebido parcial",
      count: summary?.partiallyReceived ?? 0,
      accent: "text-cyan-300",
    },
    {
      value: "RECEIVED",
      label: "Recebidos",
      count: summary?.received ?? 0,
      accent: "text-emerald-300",
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-6 px-4 py-5 lg:px-6 lg:py-7">
        <section className="relative overflow-hidden rounded-2xl border bg-[radial-gradient(circle_at_88%_10%,rgba(14,165,233,0.20),transparent_32%),radial-gradient(circle_at_12%_100%,rgba(245,158,11,0.12),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent)] p-5 sm:p-7">
          <div className="absolute right-8 top-7 hidden h-28 w-28 rounded-full border border-sky-400/10 lg:block" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
                <span className="size-2 rounded-full bg-sky-300 shadow-[0_0_18px_rgba(125,211,252,0.8)]" />
                Fila unificada
              </div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Itens operacionais
              </h2>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                Encontre o que falta comprar ou receber sem percorrer ordem por
                ordem. Cada atualizacao continua registrada no documento de
                origem automaticamente.
              </p>
            </div>
            <button
              type="button"
              className="flex min-w-48 items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-left transition-colors hover:bg-amber-400/10"
              onClick={() => {
                setDeadline("OVERDUE");
                setPage(1);
              }}
            >
              <IconAlertTriangle className="size-6 text-amber-300" />
              <span>
                <span className="block text-2xl font-semibold text-amber-200">
                  {summary?.overdue ?? 0}
                </span>
                <span className="text-xs text-muted-foreground">
                  itens com prazo vencido
                </span>
              </span>
            </button>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {statusCards.map((card) => {
            const isActive = status === card.value;

            return (
              <button
                key={card.value}
                type="button"
                onClick={() => setStatusFilter(card.value)}
                className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:bg-muted/20 ${
                  isActive
                    ? "border-sky-400/35 bg-sky-400/5 shadow-[0_0_24px_rgba(56,189,248,0.07)]"
                    : "bg-card"
                }`}
              >
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className={`mt-2 text-2xl font-semibold ${card.accent}`}>
                  {card.count}
                </p>
              </button>
            );
          })}
        </div>

        <Card className="gap-4 py-4">
          <CardContent className="grid gap-3 px-4 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.6fr)_repeat(4,minmax(150px,1fr))_auto]">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Produto, codigo, ordem ou cliente"
                className="pl-9"
              />
            </div>
            <Select
              value={status}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger className="w-full" translate="no">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os estados</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={customerId}
              onValueChange={(value) => {
                setCustomerId(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full" translate="no">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os clientes</SelectItem>
                {customers?.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.tradeName || customer.legalName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={deadline}
              onValueChange={(value) => {
                setDeadline(value as DeadlineFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full" translate="no">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os prazos</SelectItem>
                <SelectItem value="OVERDUE">Prazo vencido</SelectItem>
                <SelectItem value="NEXT_7_DAYS">Proximos 7 dias</SelectItem>
                <SelectItem value="NO_DATE">Sem data de entrega</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={sort}
              onValueChange={(value) => {
                setSort(value as PurchaseOrderItemSort);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full" translate="no">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="URGENCY">Mais urgentes</SelectItem>
                <SelectItem value="DELIVERY_ASC">Entrega mais proxima</SelectItem>
                <SelectItem value="DELIVERY_DESC">Entrega mais distante</SelectItem>
                <SelectItem value="NEWEST">Ordens mais novas</SelectItem>
                <SelectItem value="PRODUCT_ASC">Produto A-Z</SelectItem>
                <SelectItem value="ORDER_ASC">Numero da ordem</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              disabled={!hasFilters}
              onClick={clearFilters}
            >
              <IconFilterOff />
              Limpar
            </Button>
          </CardContent>
        </Card>

        {isFetchingItems && !items && (
          <Card>
            <CardContent className="py-10 text-sm text-muted-foreground">
              Montando a fila operacional...
            </CardContent>
          </Card>
        )}

        {isError && (
          <Card className="border-destructive/40">
            <CardContent className="flex flex-col items-start gap-3 py-8">
              <p className="font-medium">
                Nao foi possivel carregar os itens operacionais.
              </p>
              <p className="text-sm text-muted-foreground">
                Verifique se a nova funcao da API ja esta disponivel neste
                ambiente.
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {!isFetchingItems && !isError && !items?.length && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="rounded-2xl bg-sky-500/10 p-4 text-sky-300">
                <IconClipboardList className="size-9" />
              </div>
              <div>
                <p className="font-semibold">Nenhum item encontrado</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Ajuste os filtros ou ative uma ordem de compra para que seus
                  itens aparecam nesta fila.
                </p>
              </div>
              {hasFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {items?.map((item) => {
            const isLoadingThisItem =
              operationTarget?.itemId === item.id &&
              isFetchingOperationOrder;

            return (
              <article
                key={item.id}
                className={`group relative overflow-hidden rounded-2xl border bg-card p-4 transition-all hover:border-sky-400/25 sm:p-5 ${
                  item.isOverdue ? "border-l-2 border-l-amber-400/70" : ""
                }`}
              >
                <div className="grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-sm font-semibold text-emerald-300">
                    {item.lineNumber}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold tracking-tight">
                        {item.description}
                      </h3>
                      {item.productCode && (
                        <span className="rounded-md border bg-muted/20 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {item.productCode}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.brand}
                      {item.specification ? ` - ${item.specification}` : ""}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                      <Link
                        to={`/orders/${item.order.id}`}
                        className="font-medium text-sky-300 hover:text-sky-200"
                      >
                        Ordem {item.order.orderNumber}
                      </Link>
                      <span>{customerName(item)}</span>
                      <span
                        className={`flex items-center gap-1.5 ${
                          item.isOverdue ? "text-amber-300" : ""
                        }`}
                      >
                        <IconCalendarDue className="size-3.5" />
                        {deadlineLabel(item)}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                        Pedido: {formatQuantity(item.orderedQuantity)} {item.originalUnit}
                      </span>
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
                        Comprado: {formatQuantity(item.acquiredQuantity)}
                      </span>
                      <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-sky-300">
                        Recebido: {formatQuantity(item.receivedQuantity)}
                      </span>
                      {item.purchasePendingQuantity > 0 && (
                        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 font-medium text-amber-300">
                          Falta comprar: {formatQuantity(item.purchasePendingQuantity)}
                        </span>
                      )}
                      {item.receiptPendingQuantity > 0 && (
                        <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 font-medium text-cyan-300">
                          Aguardando chegada: {formatQuantity(item.receiptPendingQuantity)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex min-w-52 flex-col items-start gap-3 lg:items-end">
                    <div className="lg:text-right">
                      <p className="text-sm font-semibold">
                        {formatCurrency(item.officialTotal)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatCurrency(item.saleUnitPrice)} por {item.originalUnit}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[item.procurementStatus]}`}
                    >
                      {statusLabels[item.procurementStatus]}
                    </span>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {item.purchasePendingQuantity > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={
                            isLoadingThisItem &&
                            operationTarget?.kind === "purchase"
                          }
                          onClick={() =>
                            setOperationTarget({
                              kind: "purchase",
                              orderId: item.order.id,
                              itemId: item.id,
                            })
                          }
                        >
                          <IconShoppingCart />
                          Comprar
                        </Button>
                      )}
                      {item.receiptPendingQuantity > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={
                            isLoadingThisItem &&
                            operationTarget?.kind === "receipt"
                          }
                          onClick={() =>
                            setOperationTarget({
                              kind: "receipt",
                              orderId: item.order.id,
                              itemId: item.id,
                            })
                          }
                        >
                          <IconPackageImport />
                          Receber
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/orders/${item.order.id}`}>
                          Abrir ordem
                          <IconArrowRight />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {pagination && pagination.total > 0 && (
          <div className="flex flex-col gap-3 rounded-2xl border bg-card px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground">
              Mostrando {(pagination.page - 1) * pagination.pageSize + 1} a{" "}
              {Math.min(
                pagination.page * pagination.pageSize,
                pagination.total
              )}{" "}
              de {pagination.total} itens
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page <= 1 || isFetchingItems}
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
              >
                <IconChevronLeft />
                Anterior
              </Button>
              <span className="min-w-20 text-center text-xs text-muted-foreground">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  pagination.page >= pagination.totalPages || isFetchingItems
                }
                onClick={() => setPage((current) => current + 1)}
              >
                Proxima
                <IconChevronRight />
              </Button>
            </div>
          </div>
        )}
      </div>

      {operationTarget?.kind === "purchase" && operationOrder && (
        <AcquisitionModal
          isOpen={true}
          onClose={closeOperation}
          order={operationOrder}
          initialPurchaseOrderItemId={operationTarget.itemId}
        />
      )}

      <Dialog
        open={
          operationTarget?.kind === "receipt" && !receiptAcquisition
        }
        onOpenChange={(open) => {
          if (!open) {
            closeOperation();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecionar compra</DialogTitle>
            <DialogDescription>
              Escolha em qual compra a chegada deste item sera registrada.
            </DialogDescription>
          </DialogHeader>

          {(isFetchingOperationOrder || isFetchingAcquisitions) && (
            <p className="py-6 text-sm text-muted-foreground">
              Carregando compras vinculadas...
            </p>
          )}

          {(isOperationOrderError || isAcquisitionError) && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
              Nao foi possivel carregar as compras deste item.
            </div>
          )}

          {!isFetchingAcquisitions &&
            !isAcquisitionError &&
            operationOrder &&
            !receiptCandidates.length && (
              <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                Nao ha uma compra ativa com saldo de recebimento para este item.
              </div>
            )}

          <div className="space-y-2">
            {receiptCandidates.map((acquisition) => (
              <button
                key={acquisition.id}
                type="button"
                className="flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition-colors hover:border-cyan-400/30 hover:bg-cyan-400/5"
                onClick={() => setReceiptAcquisition(acquisition)}
              >
                <span>
                  <span className="block font-medium">
                    {acquisition.sellerName || "Compra sem vendedor informado"}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {formatDate(acquisition.purchasedAt)} - {acquisition.itemCount}{" "}
                    {acquisition.itemCount === 1 ? "item" : "itens"}
                  </span>
                </span>
                <IconPackage className="size-5 shrink-0 text-cyan-300" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {operationTarget?.kind === "receipt" &&
        operationOrder &&
        receiptAcquisition && (
          <AcquisitionReceiptModal
            isOpen={true}
            onClose={closeOperation}
            order={operationOrder}
            acquisition={receiptAcquisition}
            initialPurchaseOrderItemId={operationTarget.itemId}
          />
        )}

      {operationTarget?.kind === "purchase" && isOperationOrderError && (
        <Dialog open={true} onOpenChange={closeOperation}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nao foi possivel abrir a compra</DialogTitle>
              <DialogDescription>
                A ordem vinculada nao foi carregada. Feche esta mensagem e
                tente novamente.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
