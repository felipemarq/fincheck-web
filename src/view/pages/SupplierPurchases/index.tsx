import {
  IconArrowRight,
  IconEdit,
  IconPackage,
  IconSearch,
  IconShoppingCart,
  IconTruckDelivery,
} from "@tabler/icons-react";
import { useDeferredValue, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import type {
  Acquisition,
  AcquisitionStatus,
} from "@/app/entities/Acquisition";
import { useAuth } from "@/app/hooks/useAuth";
import { usePurchaseOrderItems } from "@/app/hooks/usePurchaseOrderItems";
import { useSupplierPurchases } from "@/app/hooks/useSupplierPurchases";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SupplierPurchaseModal } from "@/view/modals/SupplierPurchaseModal";
import {
  formatCurrency,
  formatDate,
} from "@/view/pages/PurchaseOrders/purchaseOrderPresentation";

type StatusFilter = AcquisitionStatus | "ALL";

const statusLabels: Record<AcquisitionStatus, string> = {
  PLACED: "Pedido realizado",
  IN_TRANSIT: "Em transporte",
  PARTIALLY_RECEIVED: "Recebido parcialmente",
  RECEIVED: "Recebido",
  CANCELLED: "Cancelado",
};

const statusClasses: Record<AcquisitionStatus, string> = {
  PLACED: "bg-amber-500/10 text-amber-300",
  IN_TRANSIT: "bg-sky-500/10 text-sky-300",
  PARTIALLY_RECEIVED: "bg-cyan-500/10 text-cyan-300",
  RECEIVED: "bg-emerald-500/10 text-emerald-300",
  CANCELLED: "bg-rose-500/10 text-rose-300",
};

function mergeDestinations<T extends { id: string }>(primary: T[], extra: T[]) {
  return [...new Map([...primary, ...extra].map((item) => [item.id, item])).values()];
}

export default function SupplierPurchases() {
  const { selectedEntityId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [selected, setSelected] = useState<Acquisition | null>(null);
  const initialItemId = searchParams.get("itemId");
  const editId = searchParams.get("edit");
  const shouldCreate = searchParams.get("new") === "1" || Boolean(initialItemId);

  const {
    supplierPurchases = [],
    isFetchingSupplierPurchases,
    isError,
    refetch,
  } = useSupplierPurchases(
    {
      entityId: selectedEntityId ?? "",
      search: deferredSearch || undefined,
      status: status === "ALL" ? undefined : status,
    },
    Boolean(selectedEntityId)
  );
  const { items: destinationPage } = usePurchaseOrderItems(
    {
      entityId: selectedEntityId ?? "",
      sort: "URGENCY",
      page: 1,
      pageSize: 100,
    },
    Boolean(selectedEntityId)
  );
  const { items: initialDestinationPage } = usePurchaseOrderItems(
    {
      entityId: selectedEntityId ?? "",
      purchaseOrderItemId: initialItemId ?? undefined,
      page: 1,
      pageSize: 10,
      sort: "URGENCY",
    },
    Boolean(selectedEntityId && initialItemId)
  );

  const destinations = mergeDestinations(
    destinationPage ?? [],
    initialDestinationPage ?? []
  );
  const initialDestination = destinations.find(
    (item) => item.id === initialItemId
  );
  const editingFromUrl = supplierPurchases.find(
    (purchase) => purchase.id === editId
  );
  const modalPurchase = selected ?? editingFromUrl ?? null;
  const modalOpen = shouldCreate || Boolean(modalPurchase);
  const hasActiveFilters = Boolean(search.trim()) || status !== "ALL";

  const closeModal = () => {
    setSelected(null);
    setSearchParams({}, { replace: true });
  };

  return (
    <>
      <div className="flex flex-col gap-6 px-4 py-5 lg:px-6 lg:py-7">
        <section className="relative overflow-hidden rounded-2xl border bg-[radial-gradient(circle_at_90%_10%,rgba(16,185,129,0.18),transparent_34%),radial-gradient(circle_at_10%_100%,rgba(14,165,233,0.10),transparent_40%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent)] p-5 sm:p-7">
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
                <span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.8)]" />
                Compras centralizadas
              </div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Pedidos a fornecedores
              </h2>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                Um carrinho, um frete e um pagamento. Distribua cada produto
                para as ordens atendidas sem duplicar custos ou depender da memoria.
              </p>
            </div>
            <Button size="lg" onClick={() => setSearchParams({ new: "1" })}>
              <IconShoppingCart /> Novo pedido
            </Button>
          </div>
        </section>

        <Card className="py-4">
          <CardContent className="grid gap-3 px-4 md:grid-cols-[minmax(260px,1fr)_220px]">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Fornecedor, canal, numero do pedido ou produto"
                aria-label="Pesquisar pedidos por fornecedor, canal, numero ou produto"
              />
            </div>
            <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os estados</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {isFetchingSupplierPurchases && (
          <p className="py-10 text-center text-sm text-muted-foreground">Carregando pedidos...</p>
        )}
        {isError && (
          <div className="rounded-2xl border border-destructive/30 p-5">
            <p className="text-sm">Nao foi possivel carregar os pedidos a fornecedores.</p>
            <Button className="mt-3" size="sm" variant="outline" onClick={() => refetch()}>Tentar novamente</Button>
          </div>
        )}
        {!isFetchingSupplierPurchases && !isError && supplierPurchases.length === 0 && (
          <div className="rounded-2xl border border-dashed bg-muted/10 px-5 py-14 text-center">
            <IconPackage className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-4 font-medium">
              {hasActiveFilters
                ? "Nenhum pedido encontrado"
                : "Nenhum pedido registrado"}
            </p>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              {hasActiveFilters
                ? "Tente outro fornecedor, canal, numero do pedido, produto ou estado."
                : "Use o fluxo rapido em um item operacional ou registre aqui uma compra com varios produtos."}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {supplierPurchases.map((purchase) => {
            const canEdit = purchase.status !== "CANCELLED";
            const hasReceivedItems = [
              "PARTIALLY_RECEIVED",
              "RECEIVED",
            ].includes(purchase.status);
            return (
              <article key={purchase.id} className="overflow-hidden rounded-2xl border bg-card">
                <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[purchase.status]}`}>{statusLabels[purchase.status]}</span>
                      {purchase.unallocatedItemCount > 0 && <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">{purchase.unallocatedItemCount} produto(s) sem destino</span>}
                    </div>
                    <h3 className="mt-3 text-lg font-semibold">{purchase.sellerName || purchase.channel || "Fornecedor nao informado"}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{formatDate(purchase.purchasedAt)}{purchase.sellerOrderNumber ? ` - pedido ${purchase.sellerOrderNumber}` : ""}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                    <div className="text-right"><p className="text-xs text-muted-foreground">Custo total</p><p className="text-lg font-semibold text-emerald-300">{formatCurrency(purchase.totalCost)}</p></div>
                    {canEdit && <Button size="sm" variant="outline" onClick={() => setSelected(purchase)}><IconEdit /> {hasReceivedItems ? "Corrigir dados" : "Editar"}</Button>}
                  </div>
                </div>

                <div className="grid gap-3 border-y bg-muted/[0.04] px-4 py-3 text-sm sm:grid-cols-4 sm:px-5">
                  <Metric label="Produtos" value={String(purchase.itemCount)} />
                  <Metric label="Destinacoes" value={String(purchase.destinationCount)} />
                  <Metric label="Ordens atendidas" value={String(purchase.relatedOrderCount)} />
                  <Metric label="Pagamento" value={paymentLabel(purchase)} />
                </div>

                <div className="space-y-3 p-4 sm:p-5">
                  {purchase.items.map((item) => (
                    <div key={item.id} className="rounded-xl border bg-background/30 p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div><p className="font-medium">{item.description}</p><p className="mt-1 text-xs text-muted-foreground">{item.acquiredQuantity.toLocaleString("pt-BR")} comprados a {formatCurrency(item.costUnitPrice)} cada</p></div>
                        <p className="font-semibold">{formatCurrency(item.totalCost)}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.allocations.map((allocation) => (
                          <Link key={allocation.id ?? allocation.purchaseOrderItemId} to={`/orders/${allocation.purchaseOrderId}`} className="flex items-center gap-1.5 rounded-full bg-sky-500/10 px-2.5 py-1 text-xs text-sky-300 hover:bg-sky-500/15">
                            {allocation.allocatedQuantity.toLocaleString("pt-BR")} para OC {allocation.orderNumber} - {allocation.customerName}<IconArrowRight className="size-3" />
                          </Link>
                        ))}
                        {item.unallocatedQuantity > 0 && <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">{item.unallocatedQuantity.toLocaleString("pt-BR")} sem destino</span>}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-2 border-t px-4 py-3 text-xs text-muted-foreground sm:px-5">
                  <span>Produtos: {formatCurrency(purchase.itemsSubtotal)}</span>
                  <span>Frete: {formatCurrency(purchase.shippingCost)}</span>
                  <span>Outras despesas: {formatCurrency(purchase.otherExpenses)}</span>
                  <span>Desconto: {formatCurrency(purchase.generalDiscount)}</span>
                  {purchase.status === "IN_TRANSIT" && <span className="ml-auto flex items-center gap-1.5 text-sky-300"><IconTruckDelivery className="size-4" /> Em transporte</span>}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <SupplierPurchaseModal
        isOpen={modalOpen}
        onClose={closeModal}
        acquisition={modalPurchase}
        destinations={destinations}
        initialDestination={initialDestination}
      />
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div>;
}

function paymentLabel(purchase: Acquisition) {
  const method = purchase.paymentMethod === "CREDIT_CARD" ? "Cartao" : purchase.paymentMethod;
  return purchase.installmentCount > 1 ? `${method} em ${purchase.installmentCount}x` : method;
}
