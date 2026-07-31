import { useDeferredValue, useState } from "react";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCalendarDue,
  IconClipboardList,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import { Link } from "react-router-dom";

import type { PurchaseOrderLifecycleStatus } from "@/app/entities/PurchaseOrder";
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
  progressLabels,
} from "./purchaseOrderPresentation";

type LifecycleFilter = PurchaseOrderLifecycleStatus | "ALL";

export default function PurchaseOrders() {
  const { activeEntity, selectedEntityId } = useAuth();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [lifecycleFilter, setLifecycleFilter] =
    useState<LifecycleFilter>("ALL");

  const { orders, isFetchingOrders, isError, refetch } = usePurchaseOrders(
    {
      entityId: selectedEntityId ?? "",
      search: deferredSearch || undefined,
      lifecycleStatus:
        lifecycleFilter === "ALL" ? undefined : lifecycleFilter,
    },
    Boolean(selectedEntityId)
  );

  const activeOrders =
    orders?.filter((order) => order.lifecycleStatus === "ACTIVE").length ?? 0;
  const draftOrders =
    orders?.filter((order) => order.lifecycleStatus === "DRAFT").length ?? 0;
  const contractedTotal =
    orders?.reduce((total, order) => total + order.officialTotal, 0) ?? 0;

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

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
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
          onValueChange={(value) =>
            setLifecycleFilter(value as LifecycleFilter)
          }
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as situacoes</SelectItem>
            <SelectItem value="ACTIVE">Ativas</SelectItem>
            <SelectItem value="DRAFT">Rascunhos</SelectItem>
            <SelectItem value="CANCELLED">Canceladas</SelectItem>
          </SelectContent>
        </Select>
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
              <p className="font-semibold">Nenhuma ordem encontrada</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Cadastre um cliente e registre a primeira ordem para iniciar a
                operacao digital.
              </p>
            </div>
            <Button asChild>
              <Link to="/orders/new">
                <IconPlus />
                Criar primeira ordem
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {orders?.map((order) => (
          <Card
            key={order.id}
            className="group gap-4 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/25"
          >
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardDescription>
                    {order.customer.tradeName || order.customer.legalName}
                  </CardDescription>
                  <CardTitle className="mt-1 text-xl">
                    Ordem {order.orderNumber}
                  </CardTitle>
                </div>
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
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-xl bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Contratado</p>
                  <p className="mt-1 font-semibold">
                    {formatCurrency(order.officialTotal)}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Itens</p>
                  <p className="mt-1 font-semibold">{order.itemCount}</p>
                </div>
                <div className="col-span-2 rounded-xl bg-muted/30 p-3 sm:col-span-1">
                  <p className="text-xs text-muted-foreground">Entrega pedida</p>
                  <p className="mt-1 font-semibold">
                    {formatDate(order.requestedDeliveryAt)}
                  </p>
                </div>
              </div>

              {order.hasTotalMismatch && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-200">
                  <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    O total oficial difere da soma dos itens (
                    {formatCurrency(order.calculatedItemsTotal)}).
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between border-t pt-4 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <IconCalendarDue className="size-4" />
                  Emitida em {formatDate(order.issuedAt)}
                </span>
                <Button variant="ghost" asChild>
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
