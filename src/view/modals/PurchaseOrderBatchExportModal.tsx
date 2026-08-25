import { useDeferredValue, useState } from "react";
import {
  IconAlertTriangle,
  IconFileTypePdf,
  IconFilter,
  IconSearch,
} from "@tabler/icons-react";
import { toast } from "sonner";

import type {
  PurchaseOrderLifecycleStatus,
  PurchaseOrderOperationalStatus,
  PurchaseOrderProgress,
} from "@/app/entities/PurchaseOrder";
import { usePurchaseOrders } from "@/app/hooks/usePurchaseOrders";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_BATCH_PAGE_LIMIT,
  exportPurchaseOrdersBatchPdf,
  MAX_BATCH_COPIES,
  MAX_BATCH_PAGE_LIMIT,
  type PurchaseOrderBatchExportProgress,
  type PurchaseOrderBatchExportResult,
} from "@/view/pages/PurchaseOrders/exportPurchaseOrdersBatchPdf";

type LifecycleFilter = PurchaseOrderLifecycleStatus | "ALL";
type ProgressFilter = PurchaseOrderProgress | "ALL";
type OperationalFilter = PurchaseOrderOperationalStatus | "ALL";

export type PurchaseOrderBatchExportFilters = {
  search?: string;
  lifecycleStatus?: LifecycleFilter;
  progress?: ProgressFilter;
  operationalStatus?: OperationalFilter;
  issuedFrom?: string;
  issuedTo?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  entityId: string;
  entityName?: string;
  initialFilters?: PurchaseOrderBatchExportFilters;
};

function integerInRange(value: number, minimum: number, maximum: number) {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

export function PurchaseOrderBatchExportModal({
  isOpen,
  onClose,
  entityId,
  entityName,
  initialFilters,
}: Props) {
  const [search, setSearch] = useState(initialFilters?.search ?? "");
  const [lifecycleStatus, setLifecycleStatus] = useState<LifecycleFilter>(
    initialFilters?.lifecycleStatus === "ALL"
      ? "ACTIVE"
      : initialFilters?.lifecycleStatus ?? "ACTIVE"
  );
  const [progressStatus, setProgressStatus] = useState<ProgressFilter>(
    initialFilters?.progress ?? "ALL"
  );
  const [operationalStatus, setOperationalStatus] =
    useState<OperationalFilter>(initialFilters?.operationalStatus ?? "ALL");
  const [issuedFrom, setIssuedFrom] = useState(initialFilters?.issuedFrom ?? "");
  const [issuedTo, setIssuedTo] = useState(initialFilters?.issuedTo ?? "");
  const [copiesInput, setCopiesInput] = useState("1");
  const [pageLimitInput, setPageLimitInput] = useState(
    String(DEFAULT_BATCH_PAGE_LIMIT)
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] =
    useState<PurchaseOrderBatchExportProgress | null>(null);
  const [lastExport, setLastExport] = useState<{
    signature: string;
    result: PurchaseOrderBatchExportResult;
  } | null>(null);
  const deferredSearch = useDeferredValue(search);
  const isSearchPending = search !== deferredSearch;

  const {
    orders,
    isFetchingOrders,
    isError,
    refetch,
  } = usePurchaseOrders(
    {
      entityId,
      search: deferredSearch.trim() || undefined,
      lifecycleStatus:
        lifecycleStatus === "ALL" ? undefined : lifecycleStatus,
      progress: progressStatus === "ALL" ? undefined : progressStatus,
      operationalStatus:
        operationalStatus === "ALL" ? undefined : operationalStatus,
      issuedFrom: issuedFrom || undefined,
      issuedTo: issuedTo || undefined,
    },
    isOpen && Boolean(entityId)
  );

  const matchingOrders = orders ?? [];
  const copies = Number(copiesInput);
  const pageLimit = Number(pageLimitInput);
  const invalidDateRange = Boolean(
    issuedFrom && issuedTo && issuedFrom > issuedTo
  );
  const invalidCopies = !integerInRange(copies, 1, MAX_BATCH_COPIES);
  const invalidPageLimit = !integerInRange(
    pageLimit,
    1,
    MAX_BATCH_PAGE_LIMIT
  );
  const exportSignature = JSON.stringify([
    search,
    lifecycleStatus,
    progressStatus,
    operationalStatus,
    issuedFrom,
    issuedTo,
    copies,
    pageLimit,
    matchingOrders.map((order) => `${order.id}:${order.updatedAt}`),
  ]);
  const visibleResult =
    lastExport?.signature === exportSignature ? lastExport.result : null;
  const progressPercentage = exportProgress?.totalOrders
    ? Math.round(
        (exportProgress.currentOrder / exportProgress.totalOrders) * 100
      )
    : 0;

  function resetFilters() {
    setSearch("");
    setLifecycleStatus("ACTIVE");
    setProgressStatus("ALL");
    setOperationalStatus("ALL");
    setIssuedFrom("");
    setIssuedTo("");
  }

  async function handleExport() {
    if (
      isFetchingOrders ||
      isSearchPending ||
      isError ||
      !matchingOrders.length ||
      invalidDateRange ||
      invalidCopies ||
      invalidPageLimit
    ) {
      return;
    }

    setIsExporting(true);
    setExportProgress({
      currentOrder: 0,
      totalOrders: matchingOrders.length,
      pageCount: 0,
    });

    try {
      const result = await exportPurchaseOrdersBatchPdf({
        entityId,
        entityName,
        orderIds: matchingOrders.map((order) => order.id),
        copies,
        maxPages: pageLimit,
        onProgress: setExportProgress,
      });

      setLastExport({ signature: exportSignature, result });
      toast.success(
        `${result.exportedOrderCount} ${
          result.exportedOrderCount === 1 ? "ordem exportada" : "ordens exportadas"
        } em ${result.pageCount} ${result.pageCount === 1 ? "pagina" : "paginas"}.`
      );
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Nao foi possivel gerar o PDF em lote."
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && !isExporting && onClose()}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconFileTypePdf className="size-5 text-emerald-400" />
            Exportar ordens em lote
          </DialogTitle>
          <DialogDescription>
            Filtre as ordens, defina o numero de copias e controle o tamanho do
            arquivo pelo limite de paginas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="rounded-2xl border bg-muted/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <IconFilter className="size-4 text-emerald-400" />
                Ordens que entrarao no lote
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isExporting}
                onClick={resetFilters}
              >
                Somente em aberto
              </Button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <Field label="Busca" className="lg:col-span-3">
                <div className="relative">
                  <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Ordem, cliente ou produto"
                    className="pl-9"
                    disabled={isExporting}
                  />
                </div>
              </Field>

              <Field label="Situacao">
                <Select
                  value={lifecycleStatus}
                  onValueChange={(value) =>
                    setLifecycleStatus(value as LifecycleFilter)
                  }
                  disabled={isExporting}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Em aberto (ativas)</SelectItem>
                    <SelectItem value="DRAFT">Rascunhos</SelectItem>
                    <SelectItem value="CANCELLED">Canceladas</SelectItem>
                    <SelectItem value="ALL">Todas as situacoes</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Etapa operacional">
                <Select
                  value={progressStatus}
                  onValueChange={(value) =>
                    setProgressStatus(value as ProgressFilter)
                  }
                  disabled={isExporting}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas as etapas</SelectItem>
                    <SelectItem value="PENDING_PURCHASE">
                      Compra pendente
                    </SelectItem>
                    <SelectItem value="PARTIALLY_PURCHASED">
                      Compra parcial
                    </SelectItem>
                    <SelectItem value="PURCHASED">
                      Compra concluida
                    </SelectItem>
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
              </Field>

              <Field label="Visao operacional">
                <Select
                  value={operationalStatus}
                  onValueChange={(value) =>
                    setOperationalStatus(value as OperationalFilter)
                  }
                  disabled={isExporting}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas as visoes</SelectItem>
                    <SelectItem value="PENDING_PURCHASE">
                      Com itens para comprar
                    </SelectItem>
                    <SelectItem value="AWAITING_RECEIPT">
                      Aguardando chegada
                    </SelectItem>
                    <SelectItem value="READY_FOR_DELIVERY">
                      Prontas para entrega
                    </SelectItem>
                    <SelectItem value="IN_DELIVERY">Em entrega</SelectItem>
                    <SelectItem value="DELAYED">Atrasadas</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Emissao a partir de">
                <Input
                  type="date"
                  value={issuedFrom}
                  onChange={(event) => setIssuedFrom(event.target.value)}
                  disabled={isExporting}
                />
              </Field>
              <Field label="Emissao ate">
                <Input
                  type="date"
                  value={issuedTo}
                  onChange={(event) => setIssuedTo(event.target.value)}
                  disabled={isExporting}
                />
              </Field>
            </div>

            {invalidDateRange && (
              <p className="mt-3 text-xs text-destructive">
                A data inicial nao pode ser posterior a data final.
              </p>
            )}
          </section>

          <section className="grid gap-4 rounded-2xl border p-4 sm:grid-cols-2">
            <Field
              label="Copias por ordem"
              hint={`De 1 a ${MAX_BATCH_COPIES}. Cada ordem sera repetida por inteiro.`}
              error={
                invalidCopies
                  ? `Informe um numero inteiro entre 1 e ${MAX_BATCH_COPIES}.`
                  : undefined
              }
            >
              <Input
                type="number"
                min={1}
                max={MAX_BATCH_COPIES}
                step={1}
                value={copiesInput}
                onChange={(event) => setCopiesInput(event.target.value)}
                disabled={isExporting}
              />
            </Field>
            <Field
              label="Limite de paginas"
              hint={`Padrao ${DEFAULT_BATCH_PAGE_LIMIT}; maximo ${MAX_BATCH_PAGE_LIMIT}.`}
              error={
                invalidPageLimit
                  ? `Informe um numero inteiro entre 1 e ${MAX_BATCH_PAGE_LIMIT}.`
                  : undefined
              }
            >
              <Input
                type="number"
                min={1}
                max={MAX_BATCH_PAGE_LIMIT}
                step={1}
                value={pageLimitInput}
                onChange={(event) => setPageLimitInput(event.target.value)}
                disabled={isExporting}
              />
            </Field>
          </section>

          <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            {isFetchingOrders || isSearchPending ? (
              <p className="text-sm text-muted-foreground">
                Contando ordens correspondentes...
              </p>
            ) : isError ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-destructive">
                  Nao foi possivel consultar as ordens.
                </p>
                <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                  Tentar novamente
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold text-emerald-300">
                    {matchingOrders.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {matchingOrders.length === 1
                      ? "ordem corresponde aos filtros"
                      : "ordens correspondem aos filtros"}
                  </p>
                </div>
                <p className="max-w-md text-xs leading-5 text-muted-foreground">
                  O lote segue a ordem desta consulta. Se a proxima ordem nao
                  couber inteira com todas as copias, a exportacao termina antes
                  dela.
                </p>
              </div>
            )}
          </section>

          {isExporting && exportProgress && (
            <section className="space-y-2 rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span>
                  Preparando ordem {exportProgress.currentOrder || 1} de{" "}
                  {exportProgress.totalOrders}
                </span>
                <span className="text-muted-foreground">
                  {exportProgress.pageCount} paginas montadas
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </section>
          )}

          {visibleResult && (
            <section className="rounded-2xl border bg-muted/20 p-4 text-sm">
              <p className="font-semibold">Ultimo lote gerado</p>
              <p className="mt-1 text-muted-foreground">
                {visibleResult.exportedOrderCount} ordens, {visibleResult.pageCount}{" "}
                paginas e {copies} {copies === 1 ? "copia" : "copias"} por
                ordem.
              </p>
              {visibleResult.limitReached && (
                <p className="mt-2 flex items-start gap-2 text-amber-300">
                  <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
                  {visibleResult.skippedOrderCount} ordens ficaram fora para
                  respeitar o limite de {pageLimit} paginas.
                </p>
              )}
            </section>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isExporting}
              onClick={onClose}
            >
              Fechar
            </Button>
            <Button
              type="button"
              isLoading={isExporting}
              disabled={
                isFetchingOrders ||
                isSearchPending ||
                isError ||
                !matchingOrders.length ||
                invalidDateRange ||
                invalidCopies ||
                invalidPageLimit
              }
              onClick={handleExport}
            >
              <IconFileTypePdf />
              Gerar PDF em lote
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
