import {
  IconAlertTriangle,
  IconBox,
  IconFileTypePdf,
  IconPackage,
  IconPlus,
  IconScissors,
  IconTags,
  IconTrash,
  IconTruckDelivery,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  buildAcquisitionLabelSourceItems,
  buildDefaultAcquisitionLabelVolumes,
  countAcquisitionLabelVolumeItems,
  exportAcquisitionLabelsPdf,
  LABELS_PER_PAGE,
  MAX_ITEMS_PER_LABEL,
  MAX_LABEL_COPIES,
  MAX_LABELS_PER_EXPORT,
  toAcquisitionLabelVolumeItem,
  type AcquisitionLabelSourceItem,
  type AcquisitionLabelVolume,
} from "@/view/pages/PurchaseOrders/exportAcquisitionLabelsPdf";
import type { PdfOrganizationBrand } from "@/view/utils/pdfOrganizationBrand";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder;
  acquisitions?: Acquisition[];
  labelSourceItems?: AcquisitionLabelSourceItem[];
  sourceMode?: "PURCHASES" | "RECEIPT";
  sourceContext?: string;
  brand: PdfOrganizationBrand;
};

const QUANTITY_TOLERANCE = 0.0005;
const MAX_SPLIT_VOLUMES = 20;
let volumeSequence = 0;

function nextVolumeId() {
  volumeSequence += 1;
  return `custom-volume-${Date.now()}-${volumeSequence}`;
}

function roundQuantity(value: number) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function formatQuantity(value: number) {
  return value.toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
  });
}

function emptyVolume(): AcquisitionLabelVolume {
  return {
    id: nextVolumeId(),
    title: "",
    notes: "",
    copies: 1,
    items: [],
  };
}

function groupItemsIntoVolumes(sourceItems: AcquisitionLabelSourceItem[]) {
  const volumes: AcquisitionLabelVolume[] = [];

  for (let index = 0; index < sourceItems.length; index += MAX_ITEMS_PER_LABEL) {
    volumes.push({
      id: nextVolumeId(),
      title: "",
      notes: "",
      copies: 1,
      items: sourceItems
        .slice(index, index + MAX_ITEMS_PER_LABEL)
        .map((sourceItem) => toAcquisitionLabelVolumeItem(sourceItem)),
    });
  }

  return volumes;
}

function splitQuantity(total: number, count: number) {
  const scaledTotal = Math.round(total * 1000);
  if (scaledTotal < count) return [];

  const base = Math.floor(scaledTotal / count);
  const remainder = scaledTotal - base * count;

  return Array.from({ length: count }, (_, index) =>
    (base + (index < remainder ? 1 : 0)) / 1000
  );
}

export function AcquisitionLabelsModal({
  isOpen,
  onClose,
  order,
  acquisitions,
  labelSourceItems,
  sourceMode = "PURCHASES",
  sourceContext,
  brand,
}: Props) {
  const isReceiptSource = sourceMode === "RECEIPT";
  const sourceItems = useMemo(
    () =>
      labelSourceItems ??
      buildAcquisitionLabelSourceItems(order, acquisitions ?? []),
    [acquisitions, labelSourceItems, order]
  );
  const defaultRecipientName =
    order.customer.tradeName || order.customer.legalName;
  const defaultRecipientAddress =
    order.deliveryAddress || order.billingAddress || "";
  const [recipientName, setRecipientName] = useState(defaultRecipientName);
  const [recipientAddress, setRecipientAddress] = useState(
    defaultRecipientAddress
  );
  const [includeAddress, setIncludeAddress] = useState(
    Boolean(defaultRecipientAddress)
  );
  const [volumes, setVolumes] = useState(() =>
    buildDefaultAcquisitionLabelVolumes(sourceItems)
  );
  const [splitSourceId, setSplitSourceId] = useState(
    sourceItems[0]?.id ?? ""
  );
  const [splitCount, setSplitCount] = useState(2);
  const [isExporting, setIsExporting] = useState(false);

  const allocatedBySource = new Map<string, number>();
  volumes.forEach((volume) => {
    volume.items.forEach((item) => {
      allocatedBySource.set(
        item.sourceItemId,
        roundQuantity(
          (allocatedBySource.get(item.sourceItemId) ?? 0) + item.quantity
        )
      );
    });
  });

  const distribution = sourceItems.map((sourceItem) => {
    const allocatedQuantity = allocatedBySource.get(sourceItem.id) ?? 0;
    return {
      sourceItem,
      allocatedQuantity,
      remainingQuantity: roundQuantity(
        sourceItem.availableQuantity - allocatedQuantity
      ),
    };
  });
  const overallocatedItems = distribution.filter(
    ({ remainingQuantity }) => remainingQuantity < -QUANTITY_TOLERANCE
  );
  const undistributedItems = distribution.filter(
    ({ remainingQuantity }) => remainingQuantity > QUANTITY_TOLERANCE
  );
  const emptyVolumes = volumes.filter((volume) => !volume.items.length);
  const oversizedVolumes = volumes.filter(
    (volume) =>
      countAcquisitionLabelVolumeItems(volume.items) > MAX_ITEMS_PER_LABEL
  );
  const invalidQuantityVolumes = volumes.filter((volume) =>
    volume.items.some(
      (item) => !Number.isFinite(item.quantity) || item.quantity <= 0
    )
  );
  const invalidCopyVolumes = volumes.filter(
    (volume) =>
      !Number.isInteger(volume.copies) ||
      volume.copies < 1 ||
      volume.copies > MAX_LABEL_COPIES
  );
  const printableLabelCount = volumes.reduce(
    (total, volume) => total + (Number.isInteger(volume.copies) ? volume.copies : 0),
    0
  );
  const pageCount = Math.ceil(printableLabelCount / LABELS_PER_PAGE);

  let blockingMessage = "";
  if (!sourceItems.length) {
    blockingMessage = isReceiptSource
      ? "Esta chegada não possui itens disponíveis para etiquetar."
      : "Esta ordem ainda não possui aquisições disponíveis para etiquetar.";
  } else if (!recipientName.trim()) {
    blockingMessage = "Informe o nome do cliente que receberá os volumes.";
  } else if (!volumes.length) {
    blockingMessage = "Adicione pelo menos um volume.";
  } else if (emptyVolumes.length) {
    blockingMessage = "Remova os volumes vazios ou adicione itens a eles.";
  } else if (oversizedVolumes.length) {
    blockingMessage = `Cada etiqueta comporta até ${MAX_ITEMS_PER_LABEL} itens.`;
  } else if (invalidQuantityVolumes.length) {
    blockingMessage = "Todas as quantidades dos volumes devem ser maiores que zero.";
  } else if (invalidCopyVolumes.length) {
    blockingMessage = `As cópias devem ficar entre 1 e ${MAX_LABEL_COPIES}.`;
  } else if (overallocatedItems.length) {
    blockingMessage = "A quantidade distribuída não pode exceder a quantidade disponível.";
  } else if (printableLabelCount > MAX_LABELS_PER_EXPORT) {
    blockingMessage = `O PDF pode conter no máximo ${MAX_LABELS_PER_EXPORT} etiquetas.`;
  }

  function resetOneVolumePerItem() {
    setVolumes(buildDefaultAcquisitionLabelVolumes(sourceItems));
    toast.success(
      isReceiptSource
        ? "Restaurado um volume para cada item desta chegada."
        : "Restaurado um volume para cada item de cada compra."
    );
  }

  function groupIntoBoxes() {
    setVolumes(groupItemsIntoVolumes(sourceItems));
    toast.success(
      sourceItems.length <= MAX_ITEMS_PER_LABEL
        ? "Todos os itens foram agrupados em uma caixa."
        : `Os itens foram agrupados em caixas de até ${MAX_ITEMS_PER_LABEL} produtos.`
    );
  }

  function updateVolume(
    volumeId: string,
    updates: Partial<Pick<AcquisitionLabelVolume, "title" | "notes" | "copies">>
  ) {
    setVolumes((current) =>
      current.map((volume) =>
        volume.id === volumeId ? { ...volume, ...updates } : volume
      )
    );
  }

  function updateItemQuantity(
    volumeId: string,
    sourceItemId: string,
    quantity: number
  ) {
    setVolumes((current) =>
      current.map((volume) =>
        volume.id === volumeId
          ? {
              ...volume,
              items: volume.items.map((item) =>
                item.sourceItemId === sourceItemId
                  ? { ...item, quantity: roundQuantity(quantity) }
                  : item
              ),
            }
          : volume
      )
    );
  }

  function removeItem(volumeId: string, sourceItemId: string) {
    setVolumes((current) =>
      current.map((volume) =>
        volume.id === volumeId
          ? {
              ...volume,
              items: volume.items.filter(
                (item) => item.sourceItemId !== sourceItemId
              ),
            }
          : volume
      )
    );
  }

  function moveSourceToVolume(sourceItemId: string, targetVolumeId: string) {
    const sourceItem = sourceItems.find((item) => item.id === sourceItemId);
    const targetVolume = volumes.find((volume) => volume.id === targetVolumeId);

    if (!sourceItem || !targetVolume) return;
    if (
      countAcquisitionLabelVolumeItems([
        ...targetVolume.items,
        toAcquisitionLabelVolumeItem(sourceItem),
      ]) > MAX_ITEMS_PER_LABEL
    ) {
      toast.error(`Uma etiqueta comporta até ${MAX_ITEMS_PER_LABEL} itens.`);
      return;
    }

    setVolumes((current) => {
      const withoutSource = current.map((volume) => ({
        ...volume,
        items: volume.items.filter(
          (item) => item.sourceItemId !== sourceItemId
        ),
      }));

      return withoutSource
        .map((volume) =>
          volume.id === targetVolumeId
            ? {
                ...volume,
                items: [
                  ...volume.items,
                  toAcquisitionLabelVolumeItem(sourceItem),
                ].sort((first, second) => first.lineNumber - second.lineNumber),
              }
            : volume
        )
        .filter(
          (volume) => volume.id === targetVolumeId || volume.items.length > 0
        );
    });
  }

  function divideSelectedItem() {
    const sourceItem = sourceItems.find((item) => item.id === splitSourceId);
    const count = Math.trunc(splitCount);

    if (!sourceItem) {
      toast.error("Selecione o item que será dividido.");
      return;
    }
    if (count < 2 || count > MAX_SPLIT_VOLUMES) {
      toast.error(`Escolha entre 2 e ${MAX_SPLIT_VOLUMES} volumes.`);
      return;
    }

    const quantities = splitQuantity(sourceItem.availableQuantity, count);
    if (!quantities.length) {
      toast.error("A quantidade é pequena demais para essa divisão.");
      return;
    }

    setVolumes((current) => {
      const remainingVolumes = current
        .map((volume) => ({
          ...volume,
          items: volume.items.filter(
            (item) => item.sourceItemId !== sourceItem.id
          ),
        }))
        .filter((volume) => volume.items.length > 0);
      const splitVolumes = quantities.map((quantity) => ({
        ...emptyVolume(),
        items: [toAcquisitionLabelVolumeItem(sourceItem, quantity)],
      }));

      return [...remainingVolumes, ...splitVolumes];
    });
    toast.success(
      `${formatQuantity(sourceItem.availableQuantity)} ${sourceItem.unit} divididos em ${count} volumes.`
    );
  }

  async function handleExport() {
    if (blockingMessage || isExporting) return;

    setIsExporting(true);
    try {
      await exportAcquisitionLabelsPdf(
        {
          orderNumber: order.orderNumber,
          recipientName: recipientName.trim(),
          recipientAddress: includeAddress
            ? recipientAddress.trim() || undefined
            : undefined,
          volumes,
        },
        brand
      );
      toast.success(
        `${printableLabelCount} ${
          printableLabelCount === 1 ? "etiqueta gerada" : "etiquetas geradas"
        } em ${pageCount} ${pageCount === 1 ? "folha" : "folhas"}.`
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
      <DialogContent className="flex max-h-[94vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
        <DialogHeader className="border-b px-5 pb-4 pt-5 sm:px-6">
          <DialogTitle className="flex items-center gap-2">
            <IconTags className="size-5 text-emerald-400" />
            Personalizar etiquetas de identificação
          </DialogTitle>
          <DialogDescription>
            {isReceiptSource
              ? "Personalize os volumes desta chegada antes de gerar as etiquetas."
              : "Monte as caixas, distribua as quantidades e escolha exatamente o que será impresso em cada volume."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <section className="grid gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm font-semibold">
                Ordem {order.orderNumber} · {defaultRecipientName}
              </p>
              {sourceContext && (
                <p className="mt-1 text-xs font-medium text-emerald-300">
                  {sourceContext}
                </p>
              )}
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                A personalização vale somente para este PDF e não altera as
                {isReceiptSource
                  ? " quantidades registradas nesta chegada."
                  : " compras ou quantidades registradas na ordem."}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <SummaryMetric label="Volumes" value={volumes.length} />
              <SummaryMetric label="Etiquetas" value={printableLabelCount} />
              <SummaryMetric label="Folhas A4" value={pageCount} />
            </div>
          </section>

          <section className="rounded-2xl border bg-muted/10 p-4">
            <div className="flex items-center gap-2">
              <IconTruckDelivery className="size-4 text-emerald-400" />
              <div>
                <h3 className="text-sm font-semibold">Destinatário</h3>
                <p className="text-xs text-muted-foreground">
                  Estas são as únicas informações do cliente exibidas na etiqueta.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
              <label className="space-y-2 text-xs font-medium text-muted-foreground">
                Nome do cliente
                <Input
                  value={recipientName}
                  onChange={(event) => setRecipientName(event.target.value)}
                  maxLength={120}
                  disabled={isExporting}
                />
              </label>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Endereço de entrega
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Opcional; pode ser ocultado sem apagar o endereço.
                    </p>
                  </div>
                  <Switch
                    checked={includeAddress}
                    onCheckedChange={setIncludeAddress}
                    disabled={isExporting || !recipientAddress.trim()}
                    aria-label="Incluir endereço nas etiquetas"
                  />
                </div>
                <Textarea
                  value={recipientAddress}
                  onChange={(event) => setRecipientAddress(event.target.value)}
                  placeholder="Endereço opcional do destinatário"
                  maxLength={300}
                  rows={2}
                  disabled={isExporting}
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-muted/10 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <IconPackage className="size-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold">Distribuição rápida</h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isReceiptSource
                    ? "Por padrão, cada item recebido nesta chegada gera seu próprio volume. Depois, você pode agrupar ou dividir como precisar."
                    : "Por padrão, cada item de cada pedido ao fornecedor gera seu próprio volume. Depois, você pode agrupar ou dividir como precisar."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isExporting || !sourceItems.length}
                  onClick={resetOneVolumePerItem}
                >
                  <IconTags />
                  {isReceiptSource
                    ? "Restaurar padrão da chegada"
                    : "Restaurar padrão das compras"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isExporting || !sourceItems.length}
                  onClick={groupIntoBoxes}
                >
                  <IconBox />
                  Agrupar em caixas
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 rounded-xl border border-dashed p-3 md:grid-cols-[minmax(0,1fr)_130px_auto] md:items-end">
              <label className="space-y-2 text-xs font-medium text-muted-foreground">
                Item para dividir igualmente
                <Select
                  value={splitSourceId}
                  onValueChange={setSplitSourceId}
                  disabled={isExporting || !sourceItems.length}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um item" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceItems.map((sourceItem) => (
                      <SelectItem key={sourceItem.id} value={sourceItem.id}>
                        {sourceItem.lineNumber}. {sourceItem.productDescription} · {sourceItem.purchaseLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-2 text-xs font-medium text-muted-foreground">
                Quantidade de volumes
                <Input
                  type="number"
                  min={2}
                  max={MAX_SPLIT_VOLUMES}
                  step={1}
                  value={splitCount}
                  onChange={(event) => setSplitCount(Number(event.target.value))}
                  disabled={isExporting}
                />
              </label>
              <Button
                type="button"
                variant="outline"
                disabled={isExporting || !splitSourceId}
                onClick={divideSelectedItem}
              >
                <IconScissors />
                Dividir item
              </Button>
            </div>
          </section>

          <section>
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Controle de quantidades</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  É permitido deixar saldo sem etiqueta, mas nunca distribuir
                  mais do que foi{" "}
                  {isReceiptSource
                    ? "recebido nesta chegada"
                    : "comprado para a ordem"}
                  .
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {distribution.map(
                ({ sourceItem, allocatedQuantity, remainingQuantity }) => {
                  const hasExcess = remainingQuantity < -QUANTITY_TOLERANCE;
                  return (
                    <article
                      key={sourceItem.id}
                      className={`rounded-xl border p-3 ${
                        hasExcess
                          ? "border-red-500/40 bg-red-500/5"
                          : "bg-muted/10"
                      }`}
                    >
                      <p className="line-clamp-2 text-xs font-semibold leading-5">
                        {sourceItem.lineNumber}. {sourceItem.productDescription}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-emerald-300">
                        {sourceItem.purchaseLabel}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span>
                          Disponível: {formatQuantity(sourceItem.availableQuantity)} {sourceItem.unit}
                        </span>
                        <span>
                          Distribuído: {formatQuantity(allocatedQuantity)} {sourceItem.unit}
                        </span>
                        <span className={hasExcess ? "font-semibold text-red-400" : ""}>
                          Restante: {formatQuantity(remainingQuantity)} {sourceItem.unit}
                        </span>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          </section>

          <section>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold">Volumes para impressão</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Cada volume gera uma etiqueta; as cópias repetem a mesma etiqueta.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isExporting}
                onClick={() => setVolumes((current) => [...current, emptyVolume()])}
              >
                <IconPlus />
                Novo volume
              </Button>
            </div>

            {!volumes.length ? (
              <div className="mt-3 rounded-2xl border border-dashed px-5 py-10 text-center">
                <p className="font-medium">Nenhum volume configurado</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Adicione um volume ou use uma distribuição rápida.
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {volumes.map((volume, volumeIndex) => (
                  <VolumeEditor
                    key={volume.id}
                    volume={volume}
                    volumeIndex={volumeIndex}
                    sourceItems={sourceItems}
                    isExporting={isExporting}
                    onUpdate={(updates) => updateVolume(volume.id, updates)}
                    onUpdateQuantity={(sourceItemId, quantity) =>
                      updateItemQuantity(volume.id, sourceItemId, quantity)
                    }
                    onRemoveItem={(sourceItemId) =>
                      removeItem(volume.id, sourceItemId)
                    }
                    onMoveSource={(sourceItemId) =>
                      moveSourceToVolume(sourceItemId, volume.id)
                    }
                    onRemove={() =>
                      setVolumes((current) =>
                        current.filter((candidate) => candidate.id !== volume.id)
                      )
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-3 border-t bg-background px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0 text-xs leading-5">
            {blockingMessage ? (
              <p className="flex items-start gap-2 text-red-400">
                <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
                {blockingMessage}
              </p>
            ) : undistributedItems.length ? (
              <p className="text-amber-300">
                {undistributedItems.length} {undistributedItems.length === 1 ? "item possui" : "itens possuem"} saldo sem etiqueta. O PDF pode ser gerado assim mesmo.
              </p>
            ) : (
              <p className="text-emerald-300">
                Todas as quantidades estão distribuídas corretamente.
              </p>
            )}
            <p className="text-muted-foreground">
              {printableLabelCount} {printableLabelCount === 1 ? "etiqueta" : "etiquetas"} · {pageCount} {pageCount === 1 ? "folha A4" : "folhas A4"} · grade 2 × 3
            </p>
          </div>
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
              disabled={Boolean(blockingMessage)}
              onClick={handleExport}
            >
              <IconFileTypePdf />
              Gerar PDF personalizado
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-20 rounded-xl border bg-background/60 px-3 py-2">
      <p className="text-lg font-semibold text-emerald-300">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

type VolumeEditorProps = {
  volume: AcquisitionLabelVolume;
  volumeIndex: number;
  sourceItems: AcquisitionLabelSourceItem[];
  isExporting: boolean;
  onUpdate: (
    updates: Partial<Pick<AcquisitionLabelVolume, "title" | "notes" | "copies">>
  ) => void;
  onUpdateQuantity: (sourceItemId: string, quantity: number) => void;
  onRemoveItem: (sourceItemId: string) => void;
  onMoveSource: (sourceItemId: string) => void;
  onRemove: () => void;
};

function VolumeEditor({
  volume,
  volumeIndex,
  sourceItems,
  isExporting,
  onUpdate,
  onUpdateQuantity,
  onRemoveItem,
  onMoveSource,
  onRemove,
}: VolumeEditorProps) {
  const volumeSourceIds = new Set(
    volume.items.map((item) => item.sourceItemId)
  );
  const productCount = countAcquisitionLabelVolumeItems(volume.items);
  const hasSourceOutsideVolume = sourceItems.some(
    (sourceItem) => !volumeSourceIds.has(sourceItem.id)
  );
  const canAddItem = sourceItems.some(
    (sourceItem) =>
      !volumeSourceIds.has(sourceItem.id) &&
      countAcquisitionLabelVolumeItems([
        ...volume.items,
        toAcquisitionLabelVolumeItem(sourceItem),
      ]) <= MAX_ITEMS_PER_LABEL
  );

  return (
    <article className="overflow-hidden rounded-2xl border bg-muted/10">
      <header className="flex items-center justify-between gap-3 border-b bg-muted/10 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
            <IconBox className="size-5" />
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold">
              {volume.title.trim() || `Volume ${volumeIndex + 1}`}
            </h4>
            <p className="text-xs text-muted-foreground">
              {productCount} {productCount === 1 ? "produto" : "produtos"} · {volume.copies} {volume.copies === 1 ? "cópia" : "cópias"}
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={`Remover volume ${volumeIndex + 1}`}
          disabled={isExporting}
          onClick={onRemove}
        >
          <IconTrash />
        </Button>
      </header>

      <div className="space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_130px]">
          <label className="space-y-2 text-xs font-medium text-muted-foreground">
            Identificação opcional do volume
            <Input
              value={volume.title}
              onChange={(event) => onUpdate({ title: event.target.value })}
              placeholder="Ex.: Caixa 1, material frágil"
              maxLength={40}
              disabled={isExporting}
            />
          </label>
          <label className="space-y-2 text-xs font-medium text-muted-foreground">
            Cópias da etiqueta
            <Input
              type="number"
              min={1}
              max={MAX_LABEL_COPIES}
              step={1}
              value={volume.copies}
              onChange={(event) =>
                onUpdate({ copies: Number(event.target.value) })
              }
              disabled={isExporting}
            />
          </label>
        </div>

        <div className="space-y-2">
          {volume.items.map((item) => {
            const sourceItem = sourceItems.find(
              (candidate) => candidate.id === item.sourceItemId
            );
            return (
              <div
                key={item.sourceItemId}
                className="grid gap-3 rounded-xl border bg-background/40 p-3 md:grid-cols-[minmax(0,1fr)_150px_auto] md:items-end"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-5">
                    {item.lineNumber}. {item.productDescription}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {sourceItem?.purchaseLabel} · Disponível para etiquetas: {formatQuantity(sourceItem?.availableQuantity ?? 0)} {item.unit}
                  </p>
                </div>
                <label className="space-y-2 text-xs font-medium text-muted-foreground">
                  Quantidade neste volume
                  <Input
                    type="number"
                    min={0.001}
                    step={0.001}
                    value={item.quantity}
                    onChange={(event) =>
                      onUpdateQuantity(
                        item.sourceItemId,
                        Number(event.target.value)
                      )
                    }
                    disabled={isExporting}
                  />
                </label>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Remover ${item.productDescription} do volume`}
                  disabled={isExporting}
                  onClick={() => onRemoveItem(item.sourceItemId)}
                >
                  <IconTrash />
                </Button>
              </div>
            );
          })}
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Adicionar ou mover item para este volume
            </p>
            <Select
              value=""
              onValueChange={onMoveSource}
              disabled={isExporting || !canAddItem || !sourceItems.length}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    canAddItem
                      ? "Selecione um item da ordem"
                      : hasSourceOutsideVolume
                        ? `Limite de ${MAX_ITEMS_PER_LABEL} itens atingido`
                        : "Todos os itens já estão neste volume"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {sourceItems.map((sourceItem) => (
                  <SelectItem
                    key={sourceItem.id}
                    value={sourceItem.id}
                    disabled={
                      volumeSourceIds.has(sourceItem.id) ||
                      countAcquisitionLabelVolumeItems([
                        ...volume.items,
                        toAcquisitionLabelVolumeItem(sourceItem),
                      ]) > MAX_ITEMS_PER_LABEL
                    }
                  >
                    {sourceItem.lineNumber}. {sourceItem.productDescription} · {sourceItem.purchaseLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] leading-4 text-muted-foreground">
              Ao escolher um item que está em outro volume, toda a quantidade é
              movida para cá. Use “Dividir item” para criar vários volumes.
            </p>
          </div>
          <label className="space-y-2 text-xs font-medium text-muted-foreground">
            Observação opcional impressa
            <Textarea
              value={volume.notes}
              onChange={(event) => onUpdate({ notes: event.target.value })}
              placeholder="Ex.: Frágil, manter seco, abrir primeiro"
              maxLength={120}
              rows={2}
              disabled={isExporting}
            />
          </label>
        </div>
      </div>
    </article>
  );
}
