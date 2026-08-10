import { useDeferredValue, useState } from "react";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCalendarDue,
  IconClipboardList,
  IconFilter,
  IconPlus,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { Link, useSearchParams } from "react-router-dom";

import type {
  PurchaseOrderLifecycleStatus,
  PurchaseOrderOperationalStatus,
  PurchaseOrderProgress,
} from "@/app/entities/PurchaseOrder";
import { useAuth } from "@/app/hooks/useAuth";
import { usePurchaseOrders } from "@/app/hooks/usePurchaseOrders";
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
  lifecycleClass,
  lifecycleLabels,
  progressClass,
  progressLabels,
} from "./purchaseOrderPresentation";

type LifecycleFilter = PurchaseOrderLifecycleStatus | "ALL";
type ProgressFilter = PurchaseOrderProgress | "ALL";
type OperationalFilter = PurchaseOrderOperationalStatus | "ALL";

const lifecycleFilterOptions: LifecycleFilter[] = [
  "ALL",
  "ACTIVE",
  "DRAFT",
  "CANCELLED",
];
const progressFilterOptions: ProgressFilter[] = [
  "ALL",
  "PENDING_PURCHASE",
  "PARTIALLY_PURCHASED",
  "PURCHASED",
  "PARTIALLY_RECEIVED",
  "READY_FOR_DELIVERY",
  "IN_DELIVERY",
  "PARTIALLY_DELIVERED",
  "DELIVERED",
];
const operationalFilterOptions: OperationalFilter[] = [
  "ALL",
  "PENDING_PURCHASE",
  "AWAITING_RECEIPT",
  "READY_FOR_DELIVERY",
  "IN_DELIVERY",
  "DELAYED",
];

function readFilter<T extends string>(
  value: string | null,
  options: readonly T[],
  fallback: T
) {
  return value && options.includes(value as T) ? (value as T) : fallback;
}

function readDateFilter(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

export default function PurchaseOrders() {
  const { activeEntity, selectedEntityId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const lifecycleFilter = readFilter(
    searchParams.get("lifecycleStatus"),
    lifecycleFilterOptions,
    "ALL"
  );
  const progressFilter = readFilter(
    searchParams.get("progress"),
    progressFilterOptions,
    "ALL"
  );
  const operationalFilter = readFilter(
    searchParams.get("operationalStatus"),
    operationalFilterOptions,
    "ALL"
  );
  const issuedFrom = readDateFilter(searchParams.get("issuedFrom"));
  const issuedTo = readDateFilter(searchParams.get("issuedTo"));

  const { orders, isFetchingOrders, isError, refetch } = usePurchaseOrders(
    {
      entityId: selectedEntityId ?? "",
      search: deferredSearch || undefined,
      lifecycleStatus:
        lifecycleFilter === "ALL" ? undefined : lifecycleFilter,
      progress: progressFilter === "ALL" ? undefined : progressFilter,
      operationalStatus:
        operationalFilter === "ALL" ? undefined : operationalFilter,
      issuedFrom,
      issuedTo,
    },
    Boolean(selectedEntityId)
  );

  const activeOrders =
    orders?.filter((order) => order.lifecycleStatus === "ACTIVE").length ?? 0;
  const draftOrders =
    orders?.filter((order) => order.lifecycleStatus === "DRAFT").length ?? 0;
  const contractedTotal =
    orders?.reduce((total, order) => total + order.officialTotal, 0) ?? 0;
  const hasActiveFilters = Boolean(
    search ||
      lifecycleFilter !== "ALL" ||
      progressFilter !== "ALL" ||
      operationalFilter !== "ALL" ||
      Boolean(issuedFrom && issuedTo)
  );

  function updateFilter(name: string, value: string) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);

        if (value === "ALL") {
          next.delete(name);
        } else {
          next.set(name, value);
        }

        return next;
      },
      { replace: true }
    );
  }

  function clearFilters() {
    setSearch("");
    setSearchParams({}, { replace: true });
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-5 lg:px-6 lg:py-7">
      <section className="relative overflow-hidden rounded-2xl border bg-[radial-gradient(circle_at_82%_12%,rgba(16,185,129,0.22),transparent_34%),radial-gradient(circle_at_18%_90%,rgba(245,158,11,0.10),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent)] p-5 sm:p-7">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
              <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.8)]" />
              Central operacional
            </div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Ordens de compra
            </h2>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              Acompanhe o compromisso recebido do cliente desde os itens
              solicitados. Compras, chegadas e entregas entram nas proximas
              etapas desta mesma linha operacional.
            </p>
          </div>
          <Button size="lg" className="w-full lg:w-auto" asChild>
            <Link to="/orders/new">
              <IconPlus />
              Nova ordem
            </Link>
          </Button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="gap-3">
          <CardHeader>
            <CardDescription>Organizacao ativa</CardDescription>
            <CardTitle className="truncate">
              {activeEntity?.name ?? "Nenhuma"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="gap-3">
          <CardHeader>
            <CardDescription>Ordens ativas</CardDescription>
            <CardTitle className="text-3xl text-emerald-400">
              {activeOrders}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="gap-3">
          <CardHeader>
            <CardDescription>Rascunhos</CardDescription>
            <CardTitle className="text-3xl text-amber-300">
              {draftOrders}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="gap-3">
          <CardHeader>
            <CardDescription>Valor contratado</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(contractedTotal)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="rounded-2xl border bg-muted/10 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <IconFilter className="size-4 text-emerald-400" />
            Filtrar ordens
          </p>
          {hasActiveFilters && (
            <p className="text-xs text-muted-foreground">
              {orders?.length ?? 0} resultados
            </p>
          )}
        </div>
        {issuedFrom && issuedTo && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-300">
            <IconCalendarDue className="size-3.5" />
            Emissao de {formatDate(issuedFrom)} ate {formatDate(issuedTo)}
          </p>
        )}
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_12rem_15rem_16rem_auto]">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por ordem ou cliente"
              className="pl-9"
            />
          </div>
          <Select
            value={lifecycleFilter}
            onValueChange={(value) => updateFilter("lifecycleStatus", value)}
          >
            <SelectTrigger className="w-full" aria-label="Situacao da ordem">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Situacao: todas</SelectItem>
              <SelectItem value="ACTIVE">Ativas</SelectItem>
              <SelectItem value="DRAFT">Rascunhos</SelectItem>
              <SelectItem value="CANCELLED">Canceladas</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={progressFilter}
            onValueChange={(value) => updateFilter("progress", value)}
          >
            <SelectTrigger className="w-full" aria-label="Etapa operacional">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Etapa: todas</SelectItem>
              <SelectItem value="PENDING_PURCHASE">
                Compra pendente
              </SelectItem>
              <SelectItem value="PARTIALLY_PURCHASED">
                Compra parcial
              </SelectItem>
              <SelectItem value="PURCHASED">Compra concluida</SelectItem>
              <SelectItem value="PARTIALLY_RECEIVED">
                Recebimento parcial
              </SelectItem>
              <SelectItem value="READY_FOR_DELIVERY">
                Prontas para entrega
              </SelectItem>
              <SelectItem value="IN_DELIVERY">Em entrega</SelectItem>
              <SelectItem value="PARTIALLY_DELIVERED">
                Entrega parcial
              </SelectItem>
              <SelectItem value="DELIVERED">Entregues</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={operationalFilter}
            onValueChange={(value) => updateFilter("operationalStatus", value)}
          >
            <SelectTrigger className="w-full" aria-label="Visao do painel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Visao do painel: todas</SelectItem>
              <SelectItem value="PENDING_PURCHASE">
                Com itens para comprar
              </SelectItem>
              <SelectItem value="AWAITING_RECEIPT">
                Aguardando chegada
              </SelectItem>
              <SelectItem value="READY_FOR_DELIVERY">
                Com itens prontos para entrega
              </SelectItem>
              <SelectItem value="IN_DELIVERY">Em entrega</SelectItem>
              <SelectItem value="DELAYED">Atrasadas</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            disabled={!hasActiveFilters}
            onClick={clearFilters}
          >
            <IconX />
            Limpar
          </Button>
        </div>
      </div>

      {isFetchingOrders && (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Carregando ordens...
          </CardContent>
        </Card>
      )}

      {isError && (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col items-start gap-3 py-8">
            <p className="font-medium">Nao foi possivel carregar as ordens.</p>
            <p className="text-sm text-muted-foreground">
              Confirme se a API V2 e a migracao ja estao disponiveis neste
              ambiente.
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {!isFetchingOrders && !isError && !orders?.length && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="rounded-2xl bg-emerald-500/10 p-4 text-emerald-400">
              <IconClipboardList className="size-9" />
            </div>
            <div>
              <p className="font-semibold">
                {hasActiveFilters
                  ? "Nenhuma ordem corresponde aos filtros"
                  : "Nenhuma ordem encontrada"}
              </p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                {hasActiveFilters
                  ? "Altere os criterios ou limpe os filtros para voltar a visualizar todas as ordens."
                  : "Cadastre um cliente e registre a primeira ordem para iniciar a operacao digital."}
              </p>
            </div>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                <IconX />
                Limpar filtros
              </Button>
            ) : (
              <Button asChild>
                <Link to="/orders/new">
                  <IconPlus />
                  Criar primeira ordem
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {orders?.map((order) => (
          <Card
            key={order.id}
            className="group gap-0 overflow-hidden py-0 transition-colors hover:border-emerald-500/25 hover:bg-muted/10"
          >
            <CardContent className="p-0">
              <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(11rem,0.8fr)_minmax(10rem,0.65fr)_minmax(10rem,0.65fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-base font-semibold sm:text-lg">
                      Ordem {order.orderNumber}
                    </p>
                    {order.hasTotalMismatch && (
                      <span
                        title={`Soma dos itens: ${formatCurrency(
                          order.calculatedItemsTotal
                        )}`}
                        className="text-amber-300"
                      >
                        <IconAlertTriangle className="size-4" />
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {order.customer.tradeName || order.customer.legalName}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {order.externalNumber
                      ? `Numero externo ${order.externalNumber}`
                      : `Emitida em ${formatDate(order.issuedAt)}`}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${lifecycleClass(
                      order.lifecycleStatus
                    )}`}
                  >
                    {lifecycleLabels[order.lifecycleStatus]}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${progressClass(
                      order.progress
                    )}`}
                  >
                    {progressLabels[order.progress]}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:contents">
                  <div className="rounded-xl bg-muted/30 p-3 lg:bg-transparent lg:p-0">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <IconCalendarDue className="size-3.5" />
                      Entrega pedida
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {formatDate(order.requestedDeliveryAt)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/30 p-3 lg:bg-transparent lg:p-0">
                    <p className="text-xs text-muted-foreground">
                      {order.itemCount} {order.itemCount === 1 ? "item" : "itens"}
                    </p>
                    <p className="mt-1 font-semibold">
                      {formatCurrency(order.officialTotal)}
                    </p>
                  </div>
                </div>

                <Button variant="outline" className="w-full lg:w-auto" asChild>
                  <Link to={`/orders/${order.id}`}>
                    Abrir
                    <IconArrowRight />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
