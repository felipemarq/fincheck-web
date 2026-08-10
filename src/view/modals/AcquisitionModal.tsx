import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconAlertTriangle,
  IconCreditCard,
  IconPackage,
  IconShoppingCart,
  IconTruck,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { QueryKeys } from "@/app/config/QueryKeys";
import type { Acquisition } from "@/app/entities/Acquisition";
import type { CreditCard } from "@/app/entities/CreditCard";
import type { PurchaseOrder } from "@/app/entities/PurchaseOrder";
import { useAuth } from "@/app/hooks/useAuth";
import { useCreditCards } from "@/app/hooks/useCreditCards";
import { acquisitionService } from "@/app/services/acquisitionService";
import { treatAxiosError } from "@/app/utils/treatAxiosError";
import {
  calculatePurchaseLineTotal,
  calculatePurchaseUnitPrice,
  formatCalculatedUnitPrice,
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
import { CreditCardModal } from "@/view/modals/CreditCardModal";
import { formatCurrency } from "@/view/pages/PurchaseOrders/purchaseOrderPresentation";

const acquisitionItemSchema = z.object({
  purchaseOrderItemId: z.string().min(1),
  selected: z.boolean(),
  acquiredQuantity: z.number().nonnegative(),
  pricingMode: z.enum(["UNIT", "TOTAL"]),
  costUnitPrice: z.number().nonnegative(),
  lineTotal: z.number().nonnegative(),
  lineDiscount: z.number().nonnegative(),
  notes: z.string().trim().max(4000),
});

const acquisitionSchema = z
  .object({
    sellerName: z.string().trim().max(160),
    sellerDocument: z.string().trim().max(40),
    channel: z.string().trim().max(120),
    sellerOrderNumber: z.string().trim().max(120),
    purchasedAt: z.string().min(1, "Informe a data da compra."),
    buyerName: z.string().trim().min(1, "Informe quem comprou.").max(160),
    paymentMethod: z.enum([
      "PIX",
      "CREDIT_CARD",
      "DEBIT_CARD",
      "BOLETO",
      "BANK_TRANSFER",
      "CASH",
      "OTHER",
    ]),
    paymentInstrument: z
      .string()
      .trim()
      .max(120),
    paymentHolder: z.string().trim().max(160),
    creditCardId: z.string(),
    installmentCount: z.number().int().min(1).max(36),
    firstPaymentDueAt: z.string(),
    shippingCost: z.number().nonnegative(),
    generalDiscount: z.number().nonnegative(),
    otherExpenses: z.number().nonnegative(),
    status: z.enum(["PLACED", "IN_TRANSIT", "CANCELLED"]),
    notes: z.string().trim().max(8000),
    items: z.array(acquisitionItemSchema),
  })
  .superRefine((data, context) => {
    const selectedItems = data.items.filter((item) => item.selected);

    if (!selectedItems.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: "Selecione ao menos um item da ordem.",
      });
    }

    data.items.forEach((item, index) => {
      if (!item.selected) {
        return;
      }

      if (item.acquiredQuantity <= 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "acquiredQuantity"],
          message: "Informe uma quantidade maior que zero.",
        });
      }

      const grossCost = calculatePurchaseLineTotal({
        mode: item.pricingMode,
        quantity: item.acquiredQuantity,
        unitPrice: item.costUnitPrice,
        totalPrice: item.lineTotal,
      });
      if (item.lineDiscount > grossCost) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "lineDiscount"],
          message: "O desconto nao pode superar o custo bruto.",
        });
      }
    });

    const itemsSubtotal = selectedItems.reduce(
      (total, item) =>
        total +
        calculatePurchaseLineTotal({
          mode: item.pricingMode,
          quantity: item.acquiredQuantity,
          unitPrice: item.costUnitPrice,
          totalPrice: item.lineTotal,
        }) -
        item.lineDiscount,
      0
    );
    const grossTotal =
      itemsSubtotal + data.shippingCost + data.otherExpenses;

    if (data.generalDiscount > grossTotal) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["generalDiscount"],
        message: "O desconto nao pode superar o custo da compra.",
      });
    }

    if (data.paymentMethod === "CREDIT_CARD") {
      if (!data.creditCardId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["creditCardId"],
          message: "Selecione o cartao utilizado.",
        });
      }
      if (!data.firstPaymentDueAt) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["firstPaymentDueAt"],
          message: "Informe o vencimento da primeira parcela.",
        });
      }
    }

    if (data.paymentMethod === "BOLETO" && !data.firstPaymentDueAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["firstPaymentDueAt"],
        message: "Informe o vencimento do boleto.",
      });
    }

    if (
      data.paymentMethod === "DEBIT_CARD" &&
      (data.paymentInstrument.match(/\d/g)?.length ?? 0) > 4
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paymentInstrument"],
        message: "Use somente os quatro ultimos digitos.",
      });
    }
  });

type AcquisitionFormData = z.infer<typeof acquisitionSchema>;

type AcquisitionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder;
  acquisition?: Acquisition | null;
  initialPurchaseOrderItemId?: string | null;
};

function getLocalDateInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function optionalText(value: string, isEditing: boolean) {
  const normalized = value.trim();
  return normalized || (isEditing ? null : undefined);
}

function normalizePaymentMethod(value?: string): AcquisitionFormData["paymentMethod"] {
  if (["PIX", "CREDIT_CARD", "DEBIT_CARD", "BOLETO", "BANK_TRANSFER", "CASH", "OTHER"].includes(value ?? "")) {
    return value as AcquisitionFormData["paymentMethod"];
  }

  const normalized = value?.toLowerCase() ?? "";
  if (normalized.includes("credito") || normalized.includes("crédito")) return "CREDIT_CARD";
  if (normalized.includes("debito") || normalized.includes("débito")) return "DEBIT_CARD";
  if (normalized.includes("pix")) return "PIX";
  if (normalized.includes("boleto")) return "BOLETO";
  if (normalized.includes("dinheiro")) return "CASH";
  if (normalized.includes("transfer")) return "BANK_TRANSFER";
  return "OTHER";
}

function suggestedCardDueDate(purchasedAt: string, card: CreditCard) {
  const purchase = new Date(`${purchasedAt}T12:00:00.000Z`);
  const closingMonthOffset = purchase.getUTCDate() > card.closingDay ? 1 : 0;
  const dueMonthOffset = card.dueDay <= card.closingDay ? 1 : 0;
  const year = purchase.getUTCFullYear();
  const month = purchase.getUTCMonth() + closingMonthOffset + dueMonthOffset;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const due = new Date(Date.UTC(year, month, Math.min(card.dueDay, lastDay), 12));
  return due.toISOString().slice(0, 10);
}

function makeInitialValues(
  order: PurchaseOrder,
  acquisition?: Acquisition | null,
  initialPurchaseOrderItemId?: string | null
): AcquisitionFormData {
  const firstPendingItem =
    order.items.find((item) => item.purchasePendingQuantity > 0)?.id ??
    order.items[0]?.id;
  const initiallySelectedId =
    initialPurchaseOrderItemId ?? firstPendingItem ?? null;
  const acquisitionItemsByOrderItemId = new Map(
    acquisition?.items.flatMap((item) =>
      item.allocations
        .filter((allocation) => allocation.purchaseOrderId === order.id)
        .map((allocation) => [
          allocation.purchaseOrderItemId,
          { item, allocation },
        ] as const)
    ) ?? []
  );

  return {
    sellerName: acquisition?.sellerName ?? "",
    sellerDocument: acquisition?.sellerDocument ?? "",
    channel: acquisition?.channel ?? "",
    sellerOrderNumber: acquisition?.sellerOrderNumber ?? "",
    purchasedAt:
      acquisition?.purchasedAt.slice(0, 10) ?? getLocalDateInputValue(),
    buyerName: acquisition?.buyerName ?? "",
    paymentMethod: normalizePaymentMethod(acquisition?.paymentMethod),
    paymentInstrument: acquisition?.paymentInstrument ?? "",
    paymentHolder: acquisition?.paymentHolder ?? "",
    creditCardId: acquisition?.creditCardId ?? "",
    installmentCount: acquisition?.installmentCount ?? 1,
    firstPaymentDueAt: acquisition?.firstPaymentDueAt?.slice(0, 10) ?? "",
    shippingCost: acquisition?.shippingCost ?? 0,
    generalDiscount: acquisition?.generalDiscount ?? 0,
    otherExpenses: acquisition?.otherExpenses ?? 0,
    status:
      acquisition?.status === "CANCELLED"
        ? "CANCELLED"
        : acquisition?.status === "IN_TRANSIT"
          ? "IN_TRANSIT"
          : "PLACED",
    notes: acquisition?.notes ?? "",
    items: order.items.map((orderItem) => {
      const acquisitionEntry = acquisitionItemsByOrderItemId.get(
        orderItem.id ?? ""
      );
      const selected = Boolean(acquisitionEntry) ||
        (!acquisition && orderItem.id === initiallySelectedId);

      return {
        purchaseOrderItemId: orderItem.id ?? "",
        selected,
        acquiredQuantity:
          acquisitionEntry?.allocation.allocatedQuantity ??
          (selected ? orderItem.purchasePendingQuantity || 1 : 0),
        pricingMode: "UNIT" as const,
        costUnitPrice: acquisitionEntry?.item.costUnitPrice ?? 0,
        lineTotal:
          (acquisitionEntry?.allocation.allocatedQuantity ??
            (selected ? orderItem.purchasePendingQuantity || 1 : 0)) *
          (acquisitionEntry?.item.costUnitPrice ?? 0),
        lineDiscount: acquisitionEntry?.item.lineDiscount ?? 0,
        notes: acquisitionEntry?.allocation.notes ?? acquisitionEntry?.item.notes ?? "",
      };
    }),
  };
}

export function AcquisitionModal({
  isOpen,
  onClose,
  order,
  acquisition,
  initialPurchaseOrderItemId,
}: AcquisitionModalProps) {
  const { selectedEntityId } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = Boolean(acquisition);
  const [isCreditCardModalOpen, setIsCreditCardModalOpen] = useState(false);
  const { data: creditCards = [] } = useCreditCards(selectedEntityId, true);

  const {
    control,
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AcquisitionFormData>({
    resolver: zodResolver(acquisitionSchema),
    defaultValues: makeInitialValues(
      order,
      acquisition,
      initialPurchaseOrderItemId
    ),
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    reset(
      makeInitialValues(
        order,
        acquisition,
        initialPurchaseOrderItemId
      )
    );
  }, [
    acquisition,
    initialPurchaseOrderItemId,
    isOpen,
    order,
    reset,
  ]);

  const createMutation = useMutation({
    mutationFn: acquisitionService.create,
  });
  const updateMutation = useMutation({
    mutationFn: acquisitionService.update,
  });

  const watchedItems = watch("items");
  const shippingCost = Number(watch("shippingCost")) || 0;
  const generalDiscount = Number(watch("generalDiscount")) || 0;
  const otherExpenses = Number(watch("otherExpenses")) || 0;
  const paymentMethod = watch("paymentMethod");
  const selectedCreditCardId = watch("creditCardId");
  const purchasedAt = watch("purchasedAt");
  const selectedCreditCard = creditCards.find((card) => card.id === selectedCreditCardId);
  const itemsSubtotal = watchedItems.reduce((total, item) => {
    if (!item.selected) {
      return total;
    }

    return (
      total +
      calculatePurchaseLineTotal({
        mode: item.pricingMode,
        quantity: Number(item.acquiredQuantity) || 0,
        unitPrice: Number(item.costUnitPrice) || 0,
        totalPrice: Number(item.lineTotal) || 0,
      }) -
      (Number(item.lineDiscount) || 0)
    );
  }, 0);
  const totalCost =
    itemsSubtotal + shippingCost + otherExpenses - generalDiscount;

  const onSubmit = handleSubmit(async (formData) => {
    if (!selectedEntityId) {
      return;
    }

    const payload = {
      sellerName: optionalText(formData.sellerName, isEditing),
      sellerDocument: optionalText(formData.sellerDocument, isEditing),
      channel: optionalText(formData.channel, isEditing),
      sellerOrderNumber: optionalText(
        formData.sellerOrderNumber,
        isEditing
      ),
      purchasedAt: new Date(
        `${formData.purchasedAt}T12:00:00.000Z`
      ).toISOString(),
      buyerName: formData.buyerName.trim(),
      paymentMethod: formData.paymentMethod,
      paymentInstrument:
        formData.paymentMethod === "CREDIT_CARD"
          ? isEditing ? null : undefined
          : optionalText(formData.paymentInstrument, isEditing),
      paymentHolder:
        formData.paymentMethod === "CREDIT_CARD"
          ? isEditing ? null : undefined
          : optionalText(formData.paymentHolder, isEditing),
      creditCardId:
        formData.paymentMethod === "CREDIT_CARD"
          ? formData.creditCardId
          : isEditing ? null : undefined,
      installmentCount:
        formData.paymentMethod === "CREDIT_CARD"
          ? Number(formData.installmentCount)
          : 1,
      firstPaymentDueAt:
        formData.paymentMethod === "CREDIT_CARD" ||
        formData.paymentMethod === "BOLETO"
          ? new Date(`${formData.firstPaymentDueAt}T12:00:00.000Z`).toISOString()
          : isEditing ? null : undefined,
      shippingCost: Number(formData.shippingCost),
      generalDiscount: Number(formData.generalDiscount),
      otherExpenses: Number(formData.otherExpenses),
      status: formData.status,
      notes: optionalText(formData.notes, isEditing),
      items: formData.items
        .filter((item) => item.selected)
        .map((item) => ({
          purchaseOrderItemId: item.purchaseOrderItemId,
          acquiredQuantity: Number(item.acquiredQuantity),
          costUnitPrice: calculatePurchaseUnitPrice({
            mode: item.pricingMode,
            quantity: Number(item.acquiredQuantity),
            unitPrice: Number(item.costUnitPrice),
            totalPrice: Number(item.lineTotal),
          }),
          lineDiscount: Number(item.lineDiscount),
          notes: optionalText(item.notes, false),
        })),
    };

    try {
      if (acquisition) {
        await updateMutation.mutateAsync({
          ...payload,
          entityId: selectedEntityId,
          purchaseOrderId: order.id,
          acquisitionId: acquisition.id,
        });
        toast.success("Aquisicao atualizada.");
      } else {
        await createMutation.mutateAsync({
          ...payload,
          entityId: selectedEntityId,
          purchaseOrderId: order.id,
        });
        toast.success("Compra registrada.");
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [
            QueryKeys.ACQUISITIONS,
            selectedEntityId,
            order.id,
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.PURCHASE_ORDERS, selectedEntityId],
        }),
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.PURCHASE_ORDER_ITEMS, selectedEntityId],
        }),
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.PRODUCTS, selectedEntityId],
        }),
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.SUPPLIER_PURCHASES, selectedEntityId],
        }),
      ]);
      onClose();
    } catch (error) {
      treatAxiosError(error);
    }
  });

  return (
    <>
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconShoppingCart className="size-5 text-emerald-400" />
            {isEditing ? "Editar aquisicao" : "Registrar compra"}
          </DialogTitle>
          <DialogDescription>
            Fluxo rapido para uma compra que atende somente a ordem {order.orderNumber}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          {!isEditing && (
            <div className="flex flex-col gap-3 rounded-2xl border border-sky-400/20 bg-sky-400/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-sky-100">Este carrinho possui outros produtos ou atende outras ordens?</p>
                <p className="mt-1 text-xs text-muted-foreground">Use o pedido agrupado para registrar frete e pagamento uma unica vez.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => {
                  const itemId = watchedItems.find((item) => item.selected)?.purchaseOrderItemId ?? initialPurchaseOrderItemId;
                  onClose();
                  navigate(itemId ? `/purchases?itemId=${itemId}` : "/purchases?new=1");
                }}>
                  Compra agrupada
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => {
                  onClose();
                  navigate("/purchases");
                }}>
                  Adicionar a pedido existente
                </Button>
              </div>
            </div>
          )}
          <section className="rounded-2xl border bg-muted/10 p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <IconTruck className="size-5 text-emerald-400" />
              <div>
                <p className="font-medium">Compra e vendedor</p>
                <p className="text-xs text-muted-foreground">
                  Identifique onde e quando a compra foi realizada.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Vendedor">
                <Input
                  placeholder="Mercado Livre, distribuidor..."
                  {...register("sellerName")}
                />
              </Field>
              <Field label="Documento do vendedor">
                <Input placeholder="Opcional" {...register("sellerDocument")} />
              </Field>
              <Field label="Canal ou marketplace">
                <Input
                  placeholder="Site, loja, marketplace..."
                  {...register("channel")}
                />
              </Field>
              <Field label="Pedido no vendedor">
                <Input
                  placeholder="Numero do pedido"
                  {...register("sellerOrderNumber")}
                />
              </Field>
              <Field
                label="Data da compra"
                error={errors.purchasedAt?.message}
              >
                <Input type="date" {...register("purchasedAt")} />
              </Field>
              <Field label="Situacao">
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PLACED">
                          Compra realizada
                        </SelectItem>
                        <SelectItem value="IN_TRANSIT">
                          Em transporte
                        </SelectItem>
                        {isEditing && (
                          <SelectItem value="CANCELLED">
                            Cancelada
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border bg-muted/10 p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <IconCreditCard className="size-5 text-emerald-400" />
              <div>
                <p className="font-medium">Responsavel e pagamento</p>
                <p className="text-xs text-muted-foreground">
                  Nunca informe numero completo ou codigo de seguranca.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Quem realizou a compra"
                error={errors.buyerName?.message}
              >
                <Input
                  placeholder="Nome do responsavel"
                  error={errors.buyerName?.message}
                  {...register("buyerName")}
                />
              </Field>
              <Field
                label="Forma de pagamento"
                error={errors.paymentMethod?.message}
              >
                <Controller
                  control={control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value === "BOLETO" && purchasedAt) {
                          setValue("firstPaymentDueAt", purchasedAt, { shouldValidate: true });
                        }
                      }}
                    >
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PIX">PIX</SelectItem>
                        <SelectItem value="CREDIT_CARD">Cartao de credito</SelectItem>
                        <SelectItem value="DEBIT_CARD">Cartao de debito</SelectItem>
                        <SelectItem value="BOLETO">Boleto</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Transferencia bancaria</SelectItem>
                        <SelectItem value="CASH">Dinheiro</SelectItem>
                        <SelectItem value="OTHER">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              {paymentMethod === "CREDIT_CARD" && (
                <>
                  <Field label="Cartao utilizado" error={errors.creditCardId?.message}>
                    <div className="flex gap-2">
                      <Controller
                        control={control}
                        name="creditCardId"
                        render={({ field }) => (
                          <Select
                            value={field.value || undefined}
                            onValueChange={(value) => {
                              field.onChange(value);
                              const card = creditCards.find((item) => item.id === value);
                              if (card && purchasedAt) {
                                setValue("firstPaymentDueAt", suggestedCardDueDate(purchasedAt, card), { shouldValidate: true });
                              }
                            }}
                          >
                            <SelectTrigger className="min-w-0 flex-1"><SelectValue placeholder="Selecione um cartao" /></SelectTrigger>
                            <SelectContent>
                              {creditCards.map((card) => (
                                <SelectItem key={card.id} value={card.id}>
                                  {card.name} - final {card.lastFour}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <Button type="button" variant="outline" onClick={() => setIsCreditCardModalOpen(true)}>
                        <IconCreditCard /> Novo
                      </Button>
                    </div>
                  </Field>
                  <Field label="Numero de parcelas" error={errors.installmentCount?.message}>
                    <Input type="number" min={1} max={36} {...register("installmentCount", { valueAsNumber: true })} />
                  </Field>
                  <Field label="Primeiro vencimento" error={errors.firstPaymentDueAt?.message}>
                    <Input type="date" {...register("firstPaymentDueAt")} />
                  </Field>
                  {selectedCreditCard && (
                    <div className="rounded-xl border p-3 text-sm">
                      <p className="font-medium">{selectedCreditCard.bank} - {selectedCreditCard.brand} final {selectedCreditCard.lastFour}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Fecha dia {selectedCreditCard.closingDay}, vence dia {selectedCreditCard.dueDay}. Titular: {selectedCreditCard.holderName}.
                      </p>
                    </div>
                  )}
                </>
              )}
              {paymentMethod === "BOLETO" && (
                <Field label="Vencimento do boleto" error={errors.firstPaymentDueAt?.message}>
                  <Input type="date" {...register("firstPaymentDueAt")} />
                </Field>
              )}
              {paymentMethod !== "CREDIT_CARD" && (
                <>
                  <Field label={paymentMethod === "BOLETO" ? "Identificacao do boleto" : "Identificacao segura"} error={errors.paymentInstrument?.message}>
                    <Input
                      placeholder={paymentMethod === "DEBIT_CARD" ? "Cartao final 1234" : "Referencia opcional"}
                      error={errors.paymentInstrument?.message}
                      {...register("paymentInstrument")}
                    />
                  </Field>
                  <Field label="Titular do pagamento">
                    <Input placeholder="Nome do titular" {...register("paymentHolder")} />
                  </Field>
                </>
              )}
            </div>
          </section>

          <section className="rounded-2xl border bg-muted/10 p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <IconPackage className="size-5 text-emerald-400" />
              <div>
                <p className="font-medium">Itens atendidos</p>
                <p className="text-xs text-muted-foreground">
                  Selecione o que esta compra atende e informe o custo real.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {order.items.map((orderItem, index) => {
                const selected = watchedItems[index]?.selected;
                const itemError = errors.items?.[index];
                const pricingMode =
                  watchedItems[index]?.pricingMode ?? "UNIT";

                return (
                  <div
                    key={orderItem.id ?? orderItem.lineNumber}
                    className="rounded-xl border bg-background/40 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <Controller
                        control={control}
                        name={`items.${index}.selected`}
                        render={({ field }) => (
                          <input
                            type="checkbox"
                            className="mt-1 size-4 shrink-0 accent-emerald-500"
                            checked={field.value}
                            onChange={(event) =>
                              field.onChange(event.target.checked)
                            }
                            aria-label={`Selecionar item ${orderItem.lineNumber}`}
                          />
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium">
                              {orderItem.lineNumber}. {orderItem.description}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Solicitado: {orderItem.orderedQuantity}{" "}
                              {orderItem.originalUnit} - pendente:{" "}
                              {orderItem.purchasePendingQuantity}
                            </p>
                          </div>
                          {orderItem.excessQuantity > 0 && (
                            <span className="w-fit rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
                              Excedente atual: {orderItem.excessQuantity}
                            </span>
                          )}
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                          <Field
                            label="Quantidade comprada"
                            error={itemError?.acquiredQuantity?.message}
                          >
                            <Input
                              type="number"
                              min="0"
                              step="0.001"
                              disabled={!selected}
                              {...register(
                                `items.${index}.acquiredQuantity`,
                                { valueAsNumber: true }
                              )}
                            />
                          </Field>
                          <Field
                            label="Como informar o preco"
                          >
                            <Controller
                              control={control}
                              name={`items.${index}.pricingMode`}
                              render={({ field }) => (
                                <Select
                                  disabled={!selected}
                                  value={field.value}
                                  onValueChange={(value) => {
                                    const item = watchedItems[index];
                                    if (value === "TOTAL") {
                                      setValue(
                                        `items.${index}.lineTotal`,
                                        (Number(item.acquiredQuantity) || 0) *
                                          (Number(item.costUnitPrice) || 0)
                                      );
                                    } else {
                                      setValue(
                                        `items.${index}.costUnitPrice`,
                                        calculatePurchaseUnitPrice({
                                          mode: "TOTAL",
                                          quantity:
                                            Number(item.acquiredQuantity) || 0,
                                          unitPrice:
                                            Number(item.costUnitPrice) || 0,
                                          totalPrice:
                                            Number(item.lineTotal) || 0,
                                        })
                                      );
                                    }
                                    field.onChange(value);
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
                              )}
                            />
                          </Field>
                          <Field
                            label={
                              pricingMode === "TOTAL"
                                ? "Valor total da quantidade"
                                : "Custo unitario"
                            }
                            error={
                              pricingMode === "TOTAL"
                                ? itemError?.lineTotal?.message
                                : itemError?.costUnitPrice?.message
                            }
                          >
                            <Controller
                              control={control}
                              name={
                                pricingMode === "TOTAL"
                                  ? `items.${index}.lineTotal`
                                  : `items.${index}.costUnitPrice`
                              }
                              render={({ field }) => (
                                <>
                                  <InputCurrency
                                    variant="field"
                                    disabled={!selected}
                                    value={
                                      Number.isFinite(field.value)
                                        ? field.value
                                        : 0
                                    }
                                    onChange={field.onChange}
                                  />
                                  {pricingMode === "TOTAL" && selected && (
                                    <p className="text-xs text-emerald-300">
                                      Equivale a{" "}
                                      {formatCalculatedUnitPrice(
                                        calculatePurchaseUnitPrice({
                                          mode: "TOTAL",
                                          quantity:
                                            Number(
                                              watchedItems[index]
                                                ?.acquiredQuantity
                                            ) || 0,
                                          unitPrice: 0,
                                          totalPrice:
                                            Number(
                                              watchedItems[index]?.lineTotal
                                            ) || 0,
                                        })
                                      )}{" "}
                                      por {orderItem.originalUnit}
                                    </p>
                                  )}
                                </>
                              )}
                            />
                          </Field>
                          <Field
                            label="Desconto da linha"
                            error={itemError?.lineDiscount?.message}
                          >
                            <Controller
                              control={control}
                              name={`items.${index}.lineDiscount`}
                              render={({ field }) => (
                                <InputCurrency
                                  variant="field"
                                  disabled={!selected}
                                  value={
                                    Number.isFinite(field.value)
                                      ? field.value
                                      : 0
                                  }
                                  onChange={field.onChange}
                                />
                              )}
                            />
                          </Field>
                          <Field label="Observacoes">
                            <Input
                              placeholder="Opcional"
                              disabled={!selected}
                              {...register(`items.${index}.notes`)}
                            />
                          </Field>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {errors.items?.message && (
              <p className="mt-3 text-sm text-destructive">
                {errors.items.message}
              </p>
            )}
          </section>

          <section className="grid gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
            <Field label="Frete da compra">
              <Controller
                control={control}
                name="shippingCost"
                render={({ field }) => (
                  <InputCurrency
                    variant="field"
                    value={Number.isFinite(field.value) ? field.value : 0}
                    onChange={field.onChange}
                  />
                )}
              />
            </Field>
            <Field
              label="Desconto geral"
              error={errors.generalDiscount?.message}
            >
              <Controller
                control={control}
                name="generalDiscount"
                render={({ field }) => (
                  <InputCurrency
                    variant="field"
                    value={Number.isFinite(field.value) ? field.value : 0}
                    onChange={field.onChange}
                  />
                )}
              />
            </Field>
            <Field label="Outras despesas">
              <Controller
                control={control}
                name="otherExpenses"
                render={({ field }) => (
                  <InputCurrency
                    variant="field"
                    value={Number.isFinite(field.value) ? field.value : 0}
                    onChange={field.onChange}
                  />
                )}
              />
            </Field>
            <div className="rounded-xl border bg-black/10 p-3">
              <p className="text-xs text-muted-foreground">Custo da compra</p>
              <p className="mt-2 text-xl font-semibold text-emerald-300">
                {formatCurrency(Math.max(totalCost, 0))}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Itens: {formatCurrency(Math.max(itemsSubtotal, 0))}
              </p>
            </div>
          </section>

          {watch("status") === "CANCELLED" && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-400/5 p-4 text-sm text-amber-100">
              <IconAlertTriangle className="mt-0.5 size-5 shrink-0" />
              <p>
                Ao salvar como cancelada, esta compra deixa de contar nas
                quantidades e nos custos e nao podera mais ser editada.
              </p>
            </div>
          )}

          <Field label="Observacoes da compra">
            <Textarea
              placeholder="Prazo informado, rastreio ou contexto relevante"
              {...register("notes")}
            />
          </Field>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={
                createMutation.isPending || updateMutation.isPending
              }
            >
              {isEditing ? "Salvar aquisicao" : "Registrar compra"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    <CreditCardModal
      isOpen={isCreditCardModalOpen}
      onClose={() => setIsCreditCardModalOpen(false)}
      onSaved={(card) => {
        setValue("creditCardId", card.id, { shouldValidate: true });
        setValue("firstPaymentDueAt", suggestedCardDueDate(purchasedAt, card), { shouldValidate: true });
      }}
    />
    </>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
