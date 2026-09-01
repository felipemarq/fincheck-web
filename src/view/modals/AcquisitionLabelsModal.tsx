import {
  IconCheck,
  IconFileTypePdf,
  IconSearch,
  IconTags,
} from "@tabler/icons-react";
import { useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";

import type { Acquisition } from "@/app/entities/Acquisition";
import type { PurchaseOrder } from "@/app/entities/PurchaseOrder";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  buildAcquisitionLabels,
  exportAcquisitionLabelsPdf,
  LABELS_PER_PAGE,
} from "@/view/pages/PurchaseOrders/exportAcquisitionLabelsPdf";
import type { PdfOrganizationBrand } from "@/view/utils/pdfOrganizationBrand";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder;
  acquisitions: Acquisition[];
  brand: PdfOrganizationBrand;
};

function normalizedSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function formatQuantity(value: number) {
  return value.toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
  });
}

export function AcquisitionLabelsModal({
  isOpen,
  onClose,
  order,
  acquisitions,
  brand,
}: Props) {
  const labels = useMemo(
    () => buildAcquisitionLabels(order, acquisitions),
    [acquisitions, order]
  );
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedIds, setSelectedIds] = useState(
    () => new Set(labels.map((label) => label.id))
  );
  const [isExporting, setIsExporting] = useState(false);
  const searchTerm = normalizedSearch(deferredSearch);
  const visibleLabels = labels.filter((label) => {
    if (!searchTerm) return true;

    return normalizedSearch(
      [
        label.productDescription,
        label.brand,
        label.supplierName,
        label.supplierOrderNumber,
        label.orderNumber,
        label.customerName,
      ]
        .filter(Boolean)
        .join(" ")
    ).includes(searchTerm);
  });
  const selectedLabels = labels.filter((label) => selectedIds.has(label.id));
  const selectedPageCount = Math.ceil(
    selectedLabels.length / LABELS_PER_PAGE
  );
  const allVisibleSelected =
    visibleLabels.length > 0 &&
    visibleLabels.every((label) => selectedIds.has(label.id));

  function toggleLabel(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      visibleLabels.forEach((label) => next.add(label.id));
      return next;
    });
  }

  async function handleExport() {
    if (!selectedLabels.length || isExporting) return;

    setIsExporting(true);
    try {
      await exportAcquisitionLabelsPdf(selectedLabels, brand);
      toast.success(
        `${selectedLabels.length} ${
          selectedLabels.length === 1 ? "etiqueta gerada" : "etiquetas geradas"
        } em ${selectedPageCount} ${
          selectedPageCount === 1 ? "folha" : "folhas"
        }.`
      );
      onClose();
    } catch (error) {
      console.error("Failed to export acquisition labels", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar as etiquetas."
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
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-5 pb-4 pt-5 sm:px-6">
          <DialogTitle className="flex items-center gap-2">
            <IconTags className="size-5 text-emerald-400" />
            Gerar etiquetas de identificação
          </DialogTitle>
          <DialogDescription>
            Escolha os itens que serão impressos. Cada item selecionado ocupa
            uma etiqueta e a folha A4 comporta até seis etiquetas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-5 pb-5 sm:px-6 sm:pb-6">
          <section className="mt-4 grid gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-sm font-semibold">
                Ordem {order.orderNumber} · {order.customer.tradeName || order.customer.legalName}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                A quantidade impressa corresponde ao total desta compra
                destinado ao item da ordem. A divisão em vários volumes ficará
                disponível em uma próxima evolução.
              </p>
            </div>
            <div className="rounded-xl border bg-background/60 px-4 py-3 text-center">
              <p className="text-2xl font-semibold text-emerald-300">
                {selectedLabels.length}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                selecionadas
              </p>
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar produto, fornecedor ou pedido"
                className="pl-9"
                disabled={isExporting}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isExporting || !visibleLabels.length || allVisibleSelected}
                onClick={selectVisible}
              >
                <IconCheck />
                Selecionar visíveis
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={isExporting || !selectedIds.size}
                onClick={() => setSelectedIds(new Set())}
              >
                Limpar seleção
              </Button>
            </div>
          </div>

          <section className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {!visibleLabels.length ? (
              <div className="rounded-2xl border border-dashed px-5 py-10 text-center">
                <p className="font-medium">Nenhuma etiqueta encontrada</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ajuste a pesquisa para encontrar outro produto ou fornecedor.
                </p>
              </div>
            ) : (
              visibleLabels.map((label) => {
                const selected = selectedIds.has(label.id);

                return (
                  <label
                    key={label.id}
                    className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors ${
                      selected
                        ? "border-emerald-500/40 bg-emerald-500/[0.07]"
                        : "bg-muted/10 hover:bg-muted/20"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleLabel(label.id)}
                      disabled={isExporting}
                      className="mt-1 size-4 shrink-0 accent-emerald-500"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold leading-5">
                            {label.lineNumber}. {label.productDescription}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {label.supplierName || "Fornecedor não informado"}
                            {label.supplierOrderNumber
                              ? ` · pedido ${label.supplierOrderNumber}`
                              : ""}
                          </p>
                        </div>
                        <div className="shrink-0 rounded-xl bg-background/70 px-3 py-2 text-left sm:text-right">
                          <p className="font-semibold text-emerald-300">
                            {formatQuantity(label.quantity)} {label.unit}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            OC {label.orderNumber}
                          </p>
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </section>

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-muted-foreground">
              {selectedLabels.length
                ? `${selectedLabels.length} etiquetas · ${selectedPageCount} ${
                    selectedPageCount === 1 ? "folha A4" : "folhas A4"
                  } · grade 2 × 3`
                : "Selecione pelo menos uma etiqueta para gerar o PDF."}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={isExporting}
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                isLoading={isExporting}
                disabled={!selectedLabels.length}
                onClick={handleExport}
              >
                <IconFileTypePdf />
                Gerar PDF
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
