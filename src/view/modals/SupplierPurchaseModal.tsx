import {
  IconCreditCard,
  IconLink,
  IconPackage,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { QueryKeys } from "@/app/config/QueryKeys";
import type {
  Acquisition,
  AcquisitionInput,
  AcquisitionPaymentMethod,
} from "@/app/entities/Acquisition";
import type { PurchaseOrderItemQueueItem } from "@/app/entities/PurchaseOrderItemQueue";
import type { CreditCard } from "@/app/entities/CreditCard";
import { useAuth } from "@/app/hooks/useAuth";
import { useCreditCards } from "@/app/hooks/useCreditCards";
import { useProducts } from "@/app/hooks/useProducts";
import { supplierPurchaseService } from "@/app/services/supplierPurchaseService";
import { treatAxiosError } from "@/app/utils/treatAxiosError";
import {
  calculatePurchaseLineTotal,
  calculatePurchaseUnitPrice,
  formatCalculatedUnitPrice,
  type PurchasePriceMode,
} from "@/app/utils/purchasePricing";
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
import { Textarea } from "@/components/ui/textarea";
import { InputCurrency } from "@/view/components/InputCurrency";
import { ProductCombobox } from "@/view/components/ProductCombobox";
import { CreditCardModal } from "@/view/modals/CreditCardModal";
import { formatCurrency } from "@/view/pages/PurchaseOrders/purchaseOrderPresentation";

type AllocationDraft = {
  key: string;
  id?: string;
  purchaseOrderItemId: string;
  allocatedQuantity: number;
  notes: string;
};

type LineDraft = {
  key: string;
  id?: string;
  productId: string;
  acquiredQuantity: number;
  pricingMode: PurchasePriceMode;
  costUnitPrice: number;
  lineTotal: number;
  lineDiscount: number;
  notes: string;
  allocations: AllocationDraft[];
};

type HeaderDraft = {
  sellerName: string;
  channel: string;
  sellerOrderNumber: string;
  purchasedAt: string;
  buyerName: string;
  paymentMethod: AcquisitionPaymentMethod;
  paymentInstrument: string;
  paymentHolder: string;
  creditCardId: string;
  installmentCount: number;
  firstPaymentDueAt: string;
  shippingCost: number;
  generalDiscount: number;
  otherExpenses: number;
  status: "PLACED" | "IN_TRANSIT" | "CANCELLED";
  notes: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  acquisition?: Acquisition | null;
  destinations: PurchaseOrderItemQueueItem[];
  initialDestination?: PurchaseOrderItemQueueItem | null;
};

const paymentLabels: Record<AcquisitionPaymentMethod, string> = {
  PIX: "PIX",
  CREDIT_CARD: "Cartao de credito",
  DEBIT_CARD: "Cartao de debito",
  BOLETO: "Boleto",
  BANK_TRANSFER: "Transferencia bancaria",
  CASH: "Dinheiro",
  OTHER: "Outro",
};

function key() {
  return crypto.randomUUID();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function optional(value: string, editing: boolean) {
  return value.trim() || (editing ? null : undefined);
}

function normalizedStatus(acquisition?: Acquisition | null): HeaderDraft["status"] {
  if (acquisition?.status === "CANCELLED") return "CANCELLED";
  if (acquisition?.status === "IN_TRANSIT") return "IN_TRANSIT";
  return "PLACED";
}

function normalizePayment(value?: string): AcquisitionPaymentMethod {
  return Object.keys(paymentLabels).includes(value ?? "")
    ? (value as AcquisitionPaymentMethod)
    : "OTHER";
}

function makeHeader(acquisition?: Acquisition | null): HeaderDraft {
  return {
    sellerName: acquisition?.sellerName ?? "",
    channel: acquisition?.channel ?? "",
    sellerOrderNumber: acquisition?.sellerOrderNumber ?? "",
    purchasedAt: acquisition?.purchasedAt.slice(0, 10) ?? today(),
    buyerName: acquisition?.buyerName ?? "",
    paymentMethod: normalizePayment(acquisition?.paymentMethod),
    paymentInstrument: acquisition?.paymentInstrument ?? "",
    paymentHolder: acquisition?.paymentHolder ?? "",
    creditCardId: acquisition?.creditCardId ?? "",
    installmentCount: acquisition?.installmentCount ?? 1,
    firstPaymentDueAt: acquisition?.firstPaymentDueAt?.slice(0, 10) ?? "",
    shippingCost: acquisition?.shippingCost ?? 0,
    generalDiscount: acquisition?.generalDiscount ?? 0,
    otherExpenses: acquisition?.otherExpenses ?? 0,
    status: normalizedStatus(acquisition),
    notes: acquisition?.notes ?? "",
  };
}

function emptyLine(destination?: PurchaseOrderItemQueueItem | null): LineDraft {
  return {
    key: key(),
    productId: destination?.productId ?? "",
    acquiredQuantity: destination?.purchasePendingQuantity || 1,
    pricingMode: "UNIT",
    costUnitPrice: 0,
    lineTotal: 0,
    lineDiscount: 0,
    notes: "",
    allocations: destination
      ? [
          {
            key: key(),
            purchaseOrderItemId: destination.id,
            allocatedQuantity: destination.purchasePendingQuantity || 1,
            notes: "",
          },
        ]
      : [],
  };
}

function makeLines(
  acquisition?: Acquisition | null,
  initialDestination?: PurchaseOrderItemQueueItem | null
): LineDraft[] {
  if (!acquisition) return [emptyLine(initialDestination)];

  return acquisition.items.map((item) => ({
    key: key(),
    id: item.id,
    productId: item.productId,
    acquiredQuantity: item.acquiredQuantity,
    pricingMode: "UNIT",
    costUnitPrice: item.costUnitPrice,
    lineTotal: item.grossCost,
    lineDiscount: item.lineDiscount,
    notes: item.notes ?? "",
    allocations: item.allocations.map((allocation) => ({
      key: key(),
      id: allocation.id,
      purchaseOrderItemId: allocation.purchaseOrderItemId,
      allocatedQuantity: allocation.allocatedQuantity,
      notes: allocation.notes ?? "",
    })),
  }));
}

function makeItemsInput(lines: LineDraft[]): AcquisitionInput["items"] {
  return lines.map((line) => ({
    id: line.id,
    productId: line.productId,
    acquiredQuantity: line.acquiredQuantity,
    costUnitPrice: calculatePurchaseUnitPrice({
      mode: line.pricingMode,
      quantity: line.acquiredQuantity,
      unitPrice: line.costUnitPrice,
      totalPrice: line.lineTotal,
    }),
    lineDiscount: line.lineDiscount,
    notes: optional(line.notes, false),
    allocations: line.allocations.map((allocation) => ({
      id: allocation.id,
      purchaseOrderItemId: allocation.purchaseOrderItemId,
      allocatedQuantity: allocation.allocatedQuantity,
      notes: optional(allocation.notes, false),
    })),
  }));
}

function makePayload(
  header: HeaderDraft,
  lines: LineDraft[],
  editing: boolean
): AcquisitionInput {
  return {
    sellerName: optional(header.sellerName, editing),
    channel: optional(header.channel, editing),
    sellerOrderNumber: optional(header.sellerOrderNumber, editing),
    purchasedAt: new Date(`${header.purchasedAt}T12:00:00.000Z`).toISOString(),
    buyerName: header.buyerName.trim(),
    paymentMethod: header.paymentMethod,
    paymentInstrument:
      header.paymentMethod === "CREDIT_CARD"
        ? editing
          ? null
          : undefined
        : optional(header.paymentInstrument, editing),
    paymentHolder:
      header.paymentMethod === "CREDIT_CARD"
        ? editing
          ? null
          : undefined
        : optional(header.paymentHolder, editing),
    creditCardId:
      header.paymentMethod === "CREDIT_CARD"
        ? header.creditCardId
        : editing
          ? null
          : undefined,
    installmentCount:
      header.paymentMethod === "CREDIT_CARD" ? header.installmentCount : 1,
    firstPaymentDueAt:
      ["CREDIT_CARD", "BOLETO"].includes(header.paymentMethod)
        ? new Date(`${header.firstPaymentDueAt}T12:00:00.000Z`).toISOString()
        : editing
          ? null
          : undefined,
    shippingCost: header.shippingCost,
    generalDiscount: header.generalDiscount,
    otherExpenses: header.otherExpenses,
    status: header.status,
    notes: optional(header.notes, editing),
    items: makeItemsInput(lines),
  };
}

function sameOptional(
  left: string | null | undefined,
  right: string | null | undefined
) {
  return (left ?? null) === (right ?? null);
}

function makeUpdatePayload(
  acquisition: Acquisition,
  header: HeaderDraft,
  payload: AcquisitionInput
): Partial<AcquisitionInput> {
  const originalHeader = makeHeader(acquisition);
  const update: Partial<AcquisitionInput> = {};

  if (!sameOptional(payload.sellerName, acquisition.sellerName)) {
    update.sellerName = payload.sellerName;
  }
  if (!sameOptional(payload.channel, acquisition.channel)) {
    update.channel = payload.channel;
  }
  if (!sameOptional(payload.sellerOrderNumber, acquisition.sellerOrderNumber)) {
    update.sellerOrderNumber = payload.sellerOrderNumber;
  }
  if (header.purchasedAt !== originalHeader.purchasedAt) {
    update.purchasedAt = payload.purchasedAt;
  }
  if (payload.buyerName !== acquisition.buyerName) {
    update.buyerName = payload.buyerName;
  }

  const paymentChanged =
    header.paymentMethod !== originalHeader.paymentMethod ||
    header.paymentInstrument.trim() !==
      originalHeader.paymentInstrument.trim() ||
    header.paymentHolder.trim() !== originalHeader.paymentHolder.trim() ||
    header.creditCardId !== originalHeader.creditCardId ||
    header.installmentCount !== originalHeader.installmentCount ||
    header.firstPaymentDueAt !== originalHeader.firstPaymentDueAt;
  if (paymentChanged) {
    update.paymentMethod = payload.paymentMethod;
    update.paymentInstrument = payload.paymentInstrument;
    update.paymentHolder = payload.paymentHolder;
    update.creditCardId = payload.creditCardId;
    update.installmentCount = payload.installmentCount;
    update.firstPaymentDueAt = payload.firstPaymentDueAt;
  }

  if (payload.shippingCost !== acquisition.shippingCost) {
    update.shippingCost = payload.shippingCost;
  }
  if (payload.generalDiscount !== acquisition.generalDiscount) {
    update.generalDiscount = payload.generalDiscount;
  }
  if (payload.otherExpenses !== acquisition.otherExpenses) {
    update.otherExpenses = payload.otherExpenses;
  }
  if (header.status !== originalHeader.status) {
    update.status = payload.status;
  }
  if (!sameOptional(payload.notes, acquisition.notes)) {
    update.notes = payload.notes;
  }

  const originalItems = makeItemsInput(makeLines(acquisition));
  if (JSON.stringify(payload.items) !== JSON.stringify(originalItems)) {
    update.items = payload.items;
  }

  return update;
}

function suggestedCardDueDate(purchasedAt: string, card: CreditCard) {
  const purchase = new Date(`${purchasedAt}T12:00:00.000Z`);
  const closingMonthOffset = purchase.getUTCDate() > card.closingDay ? 1 : 0;
  const dueMonthOffset = card.dueDay <= card.closingDay ? 1 : 0;
  const year = purchase.getUTCFullYear();
  const month = purchase.getUTCMonth() + closingMonthOffset + dueMonthOffset;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(year, month, Math.min(card.dueDay, lastDay), 12)
  )
    .toISOString()
    .slice(0, 10);
}

export function SupplierPurchaseModal({
  isOpen,
  onClose,
  acquisition,
  destinations,
  initialDestination,
}: Props) {
  const { selectedEntityId } = useAuth();
  const queryClient = useQueryClient();
  const editing = Boolean(acquisition);
  const itemsLocked =
    acquisition?.status === "PARTIALLY_RECEIVED" ||
    acquisition?.status === "RECEIVED";
  const [header, setHeader] = useState(() => makeHeader(acquisition));
  const [lines, setLines] = useState(() =>
    makeLines(acquisition, initialDestination)
  );
  const [isCreditCardModalOpen, setIsCreditCardModalOpen] = useState(false);
  const { products = [] } = useProducts(
    { entityId: selectedEntityId ?? "", active: true },
    isOpen && Boolean(selectedEntityId)
  );
  const { data: creditCards = [] } = useCreditCards(selectedEntityId, true);

  useEffect(() => {
    if (!isOpen) return;
    setHeader(makeHeader(acquisition));
    setLines(makeLines(acquisition, initialDestination));
  }, [acquisition, initialDestination, isOpen]);

  const createMutation = useMutation({ mutationFn: supplierPurchaseService.create });
  const updateMutation = useMutation({ mutationFn: supplierPurchaseService.update });
  const itemsSubtotal = lines.reduce(
    (total, line) =>
      total +
      calculatePurchaseLineTotal({
        mode: line.pricingMode,
        quantity: line.acquiredQuantity,
        unitPrice: line.costUnitPrice,
        totalPrice: line.lineTotal,
      }) -
      line.lineDiscount,
    0
  );
  const totalCost =
    itemsSubtotal +
    header.shippingCost +
    header.otherExpenses -
    header.generalDiscount;

  const setHeaderField = <K extends keyof HeaderDraft>(
    field: K,
    value: HeaderDraft[K]
  ) => setHeader((current) => ({ ...current, [field]: value }));

  const setPaymentMethod = (paymentMethod: AcquisitionPaymentMethod) =>
    setHeader((current) => ({
      ...current,
      paymentMethod,
      paymentInstrument:
        current.paymentMethod === "CREDIT_CARD" &&
        paymentMethod !== "CREDIT_CARD"
          ? ""
          : current.paymentInstrument,
      paymentHolder:
        current.paymentMethod === "CREDIT_CARD" &&
        paymentMethod !== "CREDIT_CARD"
          ? ""
          : current.paymentHolder,
      creditCardId:
        paymentMethod === "CREDIT_CARD" ? current.creditCardId : "",
      installmentCount:
        paymentMethod === "CREDIT_CARD" ? current.installmentCount : 1,
      firstPaymentDueAt: ["CREDIT_CARD", "BOLETO"].includes(paymentMethod)
        ? current.firstPaymentDueAt
        : "",
    }));

  const setLine = (lineKey: string, patch: Partial<LineDraft>) =>
    setLines((current) =>
      current.map((line) =>
        line.key === lineKey ? { ...line, ...patch } : line
      )
    );

  const setAllocation = (
    lineKey: string,
    allocationKey: string,
    patch: Partial<AllocationDraft>
  ) =>
    setLines((current) =>
      current.map((line) =>
        line.key === lineKey
          ? {
              ...line,
              allocations: line.allocations.map((allocation) =>
                allocation.key === allocationKey
                  ? { ...allocation, ...patch }
                  : allocation
              ),
            }
          : line
      )
    );

  const validate = () => {
    if (!header.purchasedAt) return "Informe a data da compra.";
    if (!header.buyerName.trim()) return "Informe quem realizou a compra.";
    if (!itemsLocked && !lines.length) return "Adicione ao menos um produto.";
    if (
      !itemsLocked &&
      lines.some((line) => !line.productId || line.acquiredQuantity <= 0)
    ) {
      return "Informe produto e quantidade em todas as linhas.";
    }
    if (
      !itemsLocked &&
      lines.some(
        (line) =>
          line.lineDiscount >
          calculatePurchaseLineTotal({
            mode: line.pricingMode,
            quantity: line.acquiredQuantity,
            unitPrice: line.costUnitPrice,
            totalPrice: line.lineTotal,
          })
      )
    ) {
      return "O desconto de uma linha supera seu custo bruto.";
    }
    if (
      !itemsLocked &&
      lines.some(
        (line) =>
          line.allocations.reduce(
            (total, allocation) => total + allocation.allocatedQuantity,
            0
          ) > line.acquiredQuantity
      )
    ) {
      return "A quantidade destinada nao pode superar a quantidade comprada.";
    }
    if (
      !itemsLocked &&
      lines.some((line) =>
        line.allocations.some(
          (allocation) =>
            !allocation.purchaseOrderItemId || allocation.allocatedQuantity <= 0
        )
      )
    ) {
      return "Preencha todos os destinos adicionados.";
    }
    if (
      !itemsLocked &&
      lines.some((line) => {
        const destinationIds = line.allocations.map(
          (allocation) => allocation.purchaseOrderItemId
        );
        return new Set(destinationIds).size !== destinationIds.length;
      })
    ) {
      return "A mesma ordem nao pode se repetir na linha de um produto.";
    }
    if (
      header.generalDiscount >
      itemsSubtotal + header.shippingCost + header.otherExpenses
    ) {
      return "O desconto geral supera o custo da compra.";
    }
    if (header.paymentMethod === "CREDIT_CARD" && !header.creditCardId) {
      return "Selecione o cartao utilizado.";
    }
    if (
      header.paymentMethod === "CREDIT_CARD" &&
      (header.installmentCount < 1 || header.installmentCount > 36)
    ) {
      return "Informe entre 1 e 36 parcelas.";
    }
    if (
      ["CREDIT_CARD", "BOLETO"].includes(header.paymentMethod) &&
      !header.firstPaymentDueAt
    ) {
      return "Informe o primeiro vencimento.";
    }
    return null;
  };

  const submit = async () => {
    if (!selectedEntityId) return;
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    const payload = makePayload(header, lines, editing);

    try {
      if (acquisition) {
        const updatePayload = makeUpdatePayload(acquisition, header, payload);
        if (!Object.keys(updatePayload).length) {
          toast.info("Nenhuma alteracao para salvar.");
          return;
        }
        await updateMutation.mutateAsync({
          ...updatePayload,
          entityId: selectedEntityId,
          acquisitionId: acquisition.id,
        });
        toast.success("Pedido ao fornecedor atualizado.");
      } else {
        await createMutation.mutateAsync({ ...payload, entityId: selectedEntityId });
        toast.success("Pedido ao fornecedor registrado.");
      }
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.SUPPLIER_PURCHASES, selectedEntityId],
        }),
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.ACQUISITIONS, selectedEntityId],
        }),
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.PURCHASE_ORDERS, selectedEntityId],
        }),
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.PURCHASE_ORDER_ITEMS, selectedEntityId],
        }),
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.OPERATIONS_DASHBOARD, selectedEntityId],
        }),
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.PAYABLES, selectedEntityId],
        }),
      ]);
      onClose();
    } catch (caught) {
      treatAxiosError(caught);
    }
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconPackage className="size-5 text-emerald-400" />
              {editing ? "Editar pedido ao fornecedor" : "Novo pedido ao fornecedor"}
            </DialogTitle>
            <DialogDescription>
              {itemsLocked
                ? "Corrija os dados do pedido sem alterar produtos que ja tiveram recebimento."
                : "Registre o carrinho uma unica vez e distribua os produtos entre as ordens atendidas."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <section
              className={`grid gap-4 rounded-2xl border bg-muted/10 p-4 sm:grid-cols-2 ${itemsLocked ? "lg:grid-cols-4" : "lg:grid-cols-5"}`}
            >
              <Field label="Fornecedor ou loja">
                <Input value={header.sellerName} onChange={(event) => setHeaderField("sellerName", event.target.value)} placeholder="Mercado Livre, Magalu..." />
              </Field>
              <Field label="Canal">
                <Input value={header.channel} onChange={(event) => setHeaderField("channel", event.target.value)} placeholder="Marketplace, site, loja" />
              </Field>
              <Field label="Numero do pedido">
                <Input value={header.sellerOrderNumber} onChange={(event) => setHeaderField("sellerOrderNumber", event.target.value)} placeholder="Opcional" />
              </Field>
              <Field label="Data da compra">
                <Input type="date" value={header.purchasedAt} onChange={(event) => setHeaderField("purchasedAt", event.target.value)} />
              </Field>
              {!itemsLocked && (
                <Field label="Situacao">
                  <Select
                    value={header.status}
                    onValueChange={(value) =>
                      setHeaderField(
                        "status",
                        value as HeaderDraft["status"]
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLACED">Pedido realizado</SelectItem>
                      <SelectItem value="IN_TRANSIT">Em transporte</SelectItem>
                      {editing && (
                        <SelectItem value="CANCELLED">Cancelado</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </section>

            <section className="space-y-4 rounded-2xl border p-4 sm:p-5">
              {itemsLocked && (
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-3 text-sm text-amber-100">
                  Produtos e destinacoes ficam bloqueados porque este pedido ja
                  possui recebimento. Os demais dados ainda podem ser
                  corrigidos.
                </div>
              )}
              <fieldset
                disabled={itemsLocked}
                className={`space-y-4 ${itemsLocked ? "opacity-75" : ""}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold">Produtos do carrinho</h3>
                  <p className="text-sm text-muted-foreground">Cada produto pode atender varias ordens ou permanecer sem destino por enquanto.</p>
                </div>
                <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, emptyLine()])}>
                  <IconPlus /> Adicionar produto
                </Button>
              </div>

                {lines.map((line, lineIndex) => {
                const allocated = line.allocations.reduce((total, allocation) => total + allocation.allocatedQuantity, 0);
                const availableDestinations = destinations.filter((destination) => destination.productId === line.productId);
                return (
                  <article key={line.key} className="rounded-2xl border bg-background/30 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-sm font-semibold text-emerald-300">{lineIndex + 1}</div>
                      <div className="min-w-0 flex-1 space-y-4">
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                          <Field label="Produto">
                            <ProductCombobox
                              products={products}
                              value={line.productId || undefined}
                              onValueChange={(productId) =>
                                setLine(line.key, {
                                  productId,
                                  allocations: [],
                                })
                              }
                              placeholder="Selecione"
                            />
                          </Field>
                          <Field label="Quantidade comprada">
                            <Input type="number" min="0.001" step="0.001" value={line.acquiredQuantity} onChange={(event) => setLine(line.key, { acquiredQuantity: Number(event.target.value) })} />
                          </Field>
                          <Field label="Como informar o preco">
                            <Select
                              value={line.pricingMode}
                              onValueChange={(value) => {
                                const pricingMode = value as PurchasePriceMode;
                                setLine(
                                  line.key,
                                  pricingMode === "TOTAL"
                                    ? {
                                        pricingMode,
                                        lineTotal:
                                          line.acquiredQuantity *
                                          line.costUnitPrice,
                                      }
                                    : {
                                        pricingMode,
                                        costUnitPrice:
                                          calculatePurchaseUnitPrice({
                                            mode: "TOTAL",
                                            quantity: line.acquiredQuantity,
                                            unitPrice: line.costUnitPrice,
                                            totalPrice: line.lineTotal,
                                          }),
                                      }
                                );
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="UNIT">
                                  Valor unitario
                                </SelectItem>
                                <SelectItem value="TOTAL">
                                  Total da quantidade
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field
                            label={
                              line.pricingMode === "TOTAL"
                                ? "Valor total da quantidade"
                                : "Custo unitario"
                            }
                          >
                            <InputCurrency
                              variant="field"
                              value={
                                line.pricingMode === "TOTAL"
                                  ? line.lineTotal
                                  : line.costUnitPrice
                              }
                              onChange={(value) =>
                                setLine(
                                  line.key,
                                  line.pricingMode === "TOTAL"
                                    ? { lineTotal: value }
                                    : { costUnitPrice: value }
                                )
                              }
                            />
                            {line.pricingMode === "TOTAL" && (
                              <p className="text-xs text-emerald-300">
                                Equivale a{" "}
                                {formatCalculatedUnitPrice(
                                  calculatePurchaseUnitPrice({
                                    mode: "TOTAL",
                                    quantity: line.acquiredQuantity,
                                    unitPrice: 0,
                                    totalPrice: line.lineTotal,
                                  })
                                )}{" "}
                                por unidade
                              </p>
                            )}
                          </Field>
                          <Field label="Desconto da linha">
                            <InputCurrency variant="field" value={line.lineDiscount} onChange={(value) => setLine(line.key, { lineDiscount: value })} />
                          </Field>
                        </div>

                        <div className="rounded-xl border border-sky-400/15 bg-sky-400/[0.03] p-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="flex items-center gap-2 text-sm font-medium"><IconLink className="size-4 text-sky-300" /> Destinacoes</p>
                              <p className="mt-1 text-xs text-muted-foreground">Alocado: {allocated.toLocaleString("pt-BR")} de {line.acquiredQuantity.toLocaleString("pt-BR")}</p>
                            </div>
                            <Button type="button" size="sm" variant="outline" disabled={!line.productId || !availableDestinations.length} onClick={() => setLine(line.key, { allocations: [...line.allocations, { key: key(), purchaseOrderItemId: "", allocatedQuantity: Math.max(line.acquiredQuantity - allocated, 0), notes: "" }] })}>
                              <IconPlus /> Destinar
                            </Button>
                          </div>
                          {line.allocations.length === 0 && <p className="mt-3 rounded-lg border border-dashed p-3 text-xs text-amber-200">Sem destino. O produto ficara pendente de alocacao e nao entrara no custo de nenhuma ordem.</p>}
                          <div className="mt-3 space-y-2">
                            {line.allocations.map((allocation) => (
                              <div key={allocation.key} className="grid gap-2 rounded-xl border bg-background/40 p-3 md:grid-cols-[minmax(0,1fr)_160px_auto]">
                                <Select value={allocation.purchaseOrderItemId || undefined} onValueChange={(value) => setAllocation(line.key, allocation.key, { purchaseOrderItemId: value })}>
                                  <SelectTrigger className="w-full"><SelectValue placeholder="Ordem e cliente" /></SelectTrigger>
                                  <SelectContent>
                                    {availableDestinations.map((destination) => <SelectItem key={destination.id} value={destination.id}>OC {destination.order.orderNumber} - {destination.customer.tradeName || destination.customer.legalName} - linha {destination.lineNumber}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <Input type="number" min="0.001" step="0.001" value={allocation.allocatedQuantity} onChange={(event) => setAllocation(line.key, allocation.key, { allocatedQuantity: Number(event.target.value) })} />
                                <Button type="button" size="icon" variant="ghost" aria-label="Remover destino" onClick={() => setLine(line.key, { allocations: line.allocations.filter((candidate) => candidate.key !== allocation.key) })}><IconTrash /></Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <Button type="button" size="icon" variant="ghost" disabled={lines.length === 1} aria-label="Remover produto" onClick={() => setLines((current) => current.filter((candidate) => candidate.key !== line.key))}><IconTrash /></Button>
                    </div>
                  </article>
                );
                })}
              </fieldset>
            </section>

            <section className="grid gap-4 rounded-2xl border bg-muted/10 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Quem realizou a compra">
                <Input value={header.buyerName} onChange={(event) => setHeaderField("buyerName", event.target.value)} />
              </Field>
              <Field label="Forma de pagamento">
                <Select value={header.paymentMethod} onValueChange={(value) => setPaymentMethod(value as AcquisitionPaymentMethod)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(paymentLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              {header.paymentMethod === "CREDIT_CARD" ? (
                <>
                  <Field label="Cartao utilizado">
                    <div className="flex gap-2">
                      <Select value={header.creditCardId || undefined} onValueChange={(value) => {
                        setHeaderField("creditCardId", value);
                        const card = creditCards.find((candidate) => candidate.id === value);
                        if (card) setHeaderField("firstPaymentDueAt", suggestedCardDueDate(header.purchasedAt, card));
                      }}>
                        <SelectTrigger className="min-w-0 flex-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{creditCards.map((card) => <SelectItem key={card.id} value={card.id}>{card.name} - final {card.lastFour}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button type="button" variant="outline" onClick={() => setIsCreditCardModalOpen(true)}><IconCreditCard /> Novo</Button>
                    </div>
                  </Field>
                  <Field label="Parcelas">
                    <Input type="number" min="1" max="36" value={header.installmentCount} onChange={(event) => setHeaderField("installmentCount", Number(event.target.value))} />
                  </Field>
                  <Field label="Primeiro vencimento">
                    <Input type="date" value={header.firstPaymentDueAt} onChange={(event) => setHeaderField("firstPaymentDueAt", event.target.value)} />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Identificacao segura"><Input value={header.paymentInstrument} onChange={(event) => setHeaderField("paymentInstrument", event.target.value)} placeholder="Referencia ou final do cartao" /></Field>
                  <Field label="Titular"><Input value={header.paymentHolder} onChange={(event) => setHeaderField("paymentHolder", event.target.value)} /></Field>
                  {header.paymentMethod === "BOLETO" && <Field label="Vencimento"><Input type="date" value={header.firstPaymentDueAt} onChange={(event) => setHeaderField("firstPaymentDueAt", event.target.value)} /></Field>}
                </>
              )}
            </section>

            <section className="grid gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Frete do pedido"><InputCurrency variant="field" value={header.shippingCost} onChange={(value) => setHeaderField("shippingCost", value)} /></Field>
              <Field label="Desconto geral"><InputCurrency variant="field" value={header.generalDiscount} onChange={(value) => setHeaderField("generalDiscount", value)} /></Field>
              <Field label="Outras despesas"><InputCurrency variant="field" value={header.otherExpenses} onChange={(value) => setHeaderField("otherExpenses", value)} /></Field>
              <div className="rounded-xl border bg-black/10 p-3"><p className="text-xs text-muted-foreground">Custo total do pedido</p><p className="mt-2 text-xl font-semibold text-emerald-300">{formatCurrency(Math.max(totalCost, 0))}</p><p className="mt-1 text-xs text-muted-foreground">Produtos: {formatCurrency(itemsSubtotal)}</p></div>
            </section>

            <Field label="Observacoes"><Textarea value={header.notes} onChange={(event) => setHeaderField("notes", event.target.value)} placeholder="Contexto relevante sobre o pedido" /></Field>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="button" isLoading={pending} onClick={submit}>
                {itemsLocked
                  ? "Salvar correcoes"
                  : editing
                    ? "Salvar pedido"
                    : "Registrar pedido"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <CreditCardModal
        isOpen={isCreditCardModalOpen}
        onClose={() => setIsCreditCardModalOpen(false)}
        onSaved={(card) => {
          setHeaderField("creditCardId", card.id);
          setHeaderField("firstPaymentDueAt", suggestedCardDueDate(header.purchasedAt, card));
        }}
      />
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
