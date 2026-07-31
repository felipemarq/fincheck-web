import {
  IconAlertTriangle,
  IconArrowLeft,
  IconBuildingHospital,
  IconCalendar,
  IconEdit,
  IconMapPin,
  IconPackage,
  IconReceipt,
} from "@tabler/icons-react";
import { Link, useParams } from "react-router-dom";

import { useAuth } from "@/app/hooks/useAuth";
import { usePurchaseOrder } from "@/app/hooks/usePurchaseOrder";
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
  lifecycleClass,
  lifecycleLabels,
  progressLabels,
} from "./purchaseOrderPresentation";

export default function PurchaseOrderDetails() {
  const { purchaseOrderId = "" } = useParams();
  const { selectedEntityId } = useAuth();
  const { order, isFetchingOrder, isError, refetch } = usePurchaseOrder(
    {
      entityId: selectedEntityId ?? "",
      purchaseOrderId,
    },
    Boolean(selectedEntityId && purchaseOrderId)
  );

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
            <div className="flex gap-2">
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

  return (
    <div className="flex flex-col gap-6 px-4 py-5 lg:px-6 lg:py-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" className="w-fit" asChild>
          <Link to="/orders">
            <IconArrowLeft />
            Todas as ordens
          </Link>
        </Button>
        <Button asChild>
          <Link to={`/orders/${order.id}/edit`}>
            <IconEdit />
            Editar ordem
          </Link>
        </Button>
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
            <p className="font-medium">Divergencia de total preservada</p>
            <p className="mt-1 text-sm text-amber-100/70">
              O documento informa {formatCurrency(order.officialTotal)}, mas a
              soma das linhas e {formatCurrency(order.calculatedItemsTotal)}.
            </p>
          </div>
        </div>
      )}

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
            <Info label="Condicao de pagamento" value={order.paymentTerms} />
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
            <p className="text-muted-foreground">{order.customer.document}</p>
            <div className="flex items-start gap-2 border-t pt-3 text-muted-foreground">
              <IconMapPin className="mt-0.5 size-4 shrink-0" />
              <span>{order.deliveryAddress || "Entrega nao informada"}</span>
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
                {order.itemCount} {order.itemCount === 1 ? "linha" : "linhas"}{" "}
                no documento.
              </CardDescription>
            </div>
            <IconPackage className="size-6 text-emerald-400" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.items.map((item) => (
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
                <p className="mt-2 text-xs text-muted-foreground">
                  {item.orderedQuantity} {item.originalUnit} · unitario{" "}
                  {formatCurrency(item.saleUnitPrice)}
                </p>
              </div>
              <div className="md:text-right">
                <p className="font-semibold">
                  {formatCurrency(item.officialTotal)}
                </p>
                <span className="mt-2 inline-block rounded-full bg-sky-500/10 px-2 py-1 text-xs text-sky-300">
                  {progressLabels[item.progress]}
                </span>
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-2 border-t pt-4 text-sm sm:flex-row sm:items-center sm:justify-end">
            <span className="text-muted-foreground">Soma das linhas</span>
            <strong className="text-lg">
              {formatCurrency(order.calculatedItemsTotal)}
            </strong>
          </div>
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
              Proxima etapa operacional
            </CardTitle>
            <CardDescription>
              A ordem esta pronta para receber aquisicoes.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            O proximo modulo vinculara cada compra a estes itens e calculara
            quanto ainda falta comprar, receber e entregar.
          </CardContent>
        </Card>
      </div>
    </div>
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
