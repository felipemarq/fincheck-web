import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconAlertTriangle,
  IconFileInvoice,
  IconReceiptTax,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { QueryKeys } from "@/app/config/QueryKeys";
import type { Invoice } from "@/app/entities/Invoice";
import type { PurchaseOrder } from "@/app/entities/PurchaseOrder";
import { useAuth } from "@/app/hooks/useAuth";
import { invoiceService } from "@/app/services/invoiceService";
import { treatAxiosError } from "@/app/utils/treatAxiosError";
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
import { formatCurrency } from "@/view/pages/PurchaseOrders/purchaseOrderPresentation";

const itemSchema = z.object({
  purchaseOrderItemId: z.string().min(1),
  selected: z.boolean(),
  invoicedQuantity: z.number().nonnegative(),
  unitPrice: z.number().nonnegative(),
  notes: z.string().trim().max(4000),
});

const invoiceSchema = z
  .object({
    invoiceNumber: z
      .string()
      .trim()
      .min(1, "Informe o numero da nota.")
      .max(120),
    issuedAt: z.string().min(1, "Informe a emissao."),
    dueAt: z.string().min(1, "Informe o vencimento."),
    taxAmount: z.number().nonnegative(),
    otherDeductions: z.number().nonnegative(),
    status: z.enum(["DRAFT", "ISSUED", "CANCELLED"]),
    notes: z.string().trim().max(8000),
    items: z.array(itemSchema),
  })
  .superRefine((data, context) => {
    if (!data.items.some((item) => item.selected)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: "Selecione ao menos um item faturado.",
      });
    }

    data.items.forEach((item, index) => {
      if (item.selected && item.invoicedQuantity <= 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "invoicedQuantity"],
          message: "Informe uma quantidade maior que zero.",
        });
      }
    });

    if (
      data.issuedAt &&
      data.dueAt &&
      new Date(data.dueAt).getTime() < new Date(data.issuedAt).getTime()
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dueAt"],
        message: "O vencimento nao pode anteceder a emissao.",
      });
    }

    const gross = data.items
      .filter((item) => item.selected)
      .reduce(
        (total, item) =>
          total + item.invoicedQuantity * item.unitPrice,
        0
      );

    if (data.otherDeductions > gross) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["otherDeductions"],
        message: "As deducoes nao podem superar o valor bruto.",
      });
    }
  });

type InvoiceFormData = z.infer<typeof invoiceSchema>;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder;
  invoice?: Invoice | null;
  initialPurchaseOrderItemId?: string | null;
};

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function dueInput() {
  const due = new Date();
  due.setDate(due.getDate() + 30);
  return due.toISOString().slice(0, 10);
}

function makeValues(
  order: PurchaseOrder,
  invoice?: Invoice | null,
  initialPurchaseOrderItemId?: string | null
): InvoiceFormData {
  const currentItems = new Map(
    invoice?.items.map((item) => [item.purchaseOrderItemId, item]) ?? []
  );
  const firstAvailable =
    initialPurchaseOrderItemId ??
    order.items.find((item) => item.invoicePendingQuantity > 0)?.id;

  return {
    invoiceNumber: invoice?.invoiceNumber ?? "",
    issuedAt: invoice?.issuedAt.slice(0, 10) ?? todayInput(),
    dueAt: invoice?.dueAt.slice(0, 10) ?? dueInput(),
    taxAmount: invoice?.taxAmount ?? 0,
    otherDeductions: invoice?.otherDeductions ?? 0,
    status: invoice?.status ?? "ISSUED",
    notes: invoice?.notes ?? "",
    items: order.items.map((item) => {
      const current = currentItems.get(item.id ?? "");
      const available =
        item.invoicePendingQuantity +
        (current?.invoicedQuantity ?? 0);
      const selected =
        Boolean(current) ||
        (!invoice && item.id === firstAvailable && available > 0);

      return {
        purchaseOrderItemId: item.id ?? "",
        selected,
        invoicedQuantity:
          current?.invoicedQuantity ?? (selected ? available : 0),
        unitPrice: current?.unitPrice ?? item.saleUnitPrice,
        notes: current?.notes ?? "",
      };
    }),
  };
}

export function InvoiceModal({
  isOpen,
  onClose,
  order,
  invoice,
  initialPurchaseOrderItemId,
}: Props) {
  const { selectedEntityId } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = Boolean(invoice);
  const financialLocked = (invoice?.receivedAmount ?? 0) > 0;
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: makeValues(order, invoice, initialPurchaseOrderItemId),
  });

  useEffect(() => {
    if (isOpen) {
      reset(makeValues(order, invoice, initialPurchaseOrderItemId));
    }
  }, [initialPurchaseOrderItemId, invoice, isOpen, order, reset]);

  const createMutation = useMutation({ mutationFn: invoiceService.create });
  const updateMutation = useMutation({ mutationFn: invoiceService.update });
  const items = watch("items") ?? [];
  const status = watch("status");
  const otherDeductions = watch("otherDeductions") || 0;
  const grossAmount = items
    .filter((item) => item.selected)
    .reduce(
      (total, item) =>
        total +
        (item.invoicedQuantity || 0) * (item.unitPrice || 0),
      0
    );
  const netReceivable = Math.max(grossAmount - otherDeductions, 0);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.INVOICES, selectedEntityId, order.id],
      }),
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.PURCHASE_ORDERS, selectedEntityId],
      }),
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.OPERATIONS_DASHBOARD, selectedEntityId],
      }),
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.RECEIVABLES, selectedEntityId],
      }),
    ]);
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!selectedEntityId) {
      return;
    }

    const fullPayload = {
      entityId: selectedEntityId,
      purchaseOrderId: order.id,
      invoiceNumber: values.invoiceNumber,
      issuedAt: new Date(`${values.issuedAt}T12:00:00`).toISOString(),
      dueAt: new Date(`${values.dueAt}T12:00:00`).toISOString(),
      taxAmount: values.taxAmount,
      otherDeductions: values.otherDeductions,
      status: values.status,
      notes: values.notes.trim() || null,
      items: values.items
        .filter((item) => item.selected)
        .map((item) => ({
          purchaseOrderItemId: item.purchaseOrderItemId,
          invoicedQuantity: item.invoicedQuantity,
          unitPrice: item.unitPrice,
          notes: item.notes.trim() || undefined,
        })),
    };

    try {
      if (invoice) {
        await updateMutation.mutateAsync(
          financialLocked
            ? {
                entityId: selectedEntityId,
                purchaseOrderId: order.id,
                invoiceId: invoice.id,
                dueAt: fullPayload.dueAt,
                notes: fullPayload.notes,
              }
            : {
                ...fullPayload,
                invoiceId: invoice.id,
              }
        );
        toast.success("Nota fiscal atualizada.");
      } else {
        await createMutation.mutateAsync(fullPayload);
        toast.success("Nota fiscal registrada.");
      }

      await refresh();
      onClose();
    } catch (error) {
      treatAxiosError(error);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconFileInvoice className="size-5 text-emerald-400" />
            {isEditing ? "Editar nota fiscal" : "Registrar nota fiscal"}
          </DialogTitle>
          <DialogDescription>
            Fature somente itens ja separados para entrega e acompanhe o
            saldo que o cliente ainda deve pagar.
          </DialogDescription>
        </DialogHeader>

        {financialLocked && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-400/5 p-4 text-sm text-amber-100">
            <IconAlertTriangle className="mt-0.5 size-5 shrink-0" />
            Esta nota ja possui recebimentos. Apenas vencimento e
            observacoes podem ser alterados.
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-5">
          <section className="grid gap-4 rounded-2xl border bg-muted/10 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              label="Numero da nota"
              error={errors.invoiceNumber?.message}
            >
              <Input
                disabled={financialLocked}
                placeholder="Ex.: 000123"
                {...register("invoiceNumber")}
              />
            </Field>
            <Field label="Emissao" error={errors.issuedAt?.message}>
              <Input
                type="date"
                disabled={financialLocked}
                {...register("issuedAt")}
              />
            </Field>
            <Field label="Vencimento" error={errors.dueAt?.message}>
              <Input type="date" {...register("dueAt")} />
            </Field>
            <Field label="Situacao">
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select
                    disabled={financialLocked}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Rascunho</SelectItem>
                      <SelectItem value="ISSUED">Emitida</SelectItem>
                      {isEditing && (
                        <SelectItem value="CANCELLED">Cancelada</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="font-semibold">Itens faturados</h3>
              <p className="text-sm text-muted-foreground">
                A disponibilidade considera os lotes de entrega ainda nao
                faturados.
              </p>
            </div>

            {order.items.map((item, index) => {
              const current = invoice?.items.find(
                (entry) => entry.purchaseOrderItemId === item.id
              );
              const available =
                item.invoicePendingQuantity +
                (current?.invoicedQuantity ?? 0);
              const selected = items[index]?.selected;

              return (
                <div key={item.id} className="rounded-2xl border p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      disabled={financialLocked || available <= 0}
                      className="mt-1 size-4 accent-emerald-500"
                      {...register(`items.${index}.selected`)}
                    />
                    <span>
                      <span className="block font-medium">
                        {item.lineNumber}. {item.description}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Disponivel para faturar:{" "}
                        {available.toLocaleString("pt-BR")}{" "}
                        {item.originalUnit}
                      </span>
                    </span>
                  </label>
                  <input
                    type="hidden"
                    {...register(`items.${index}.purchaseOrderItemId`)}
                  />
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <Field
                      label="Quantidade"
                      error={
                        errors.items?.[index]?.invoicedQuantity?.message
                      }
                    >
                      <Input
                        type="number"
                        min="0"
                        max={available}
                        step="0.001"
                        disabled={financialLocked || !selected}
                        {...register(`items.${index}.invoicedQuantity`, {
                          valueAsNumber: true,
                        })}
                      />
                    </Field>
                    <Field label="Preco unitario">
                      <Controller
                        control={control}
                        name={`items.${index}.unitPrice`}
                        render={({ field }) => (
                          <InputCurrency
                            variant="field"
                            disabled={financialLocked || !selected}
                            value={
                              Number.isFinite(field.value) ? field.value : 0
                            }
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </Field>
                    <Field label="Observacoes">
                      <Input
                        disabled={financialLocked || !selected}
                        placeholder="Opcional"
                        {...register(`items.${index}.notes`)}
                      />
                    </Field>
                  </div>
                </div>
              );
            })}
            {errors.items?.message && (
              <p className="text-sm text-destructive">
                {errors.items.message}
              </p>
            )}
          </section>

          <section className="grid gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Impostos" error={errors.taxAmount?.message}>
              <Controller
                control={control}
                name="taxAmount"
                render={({ field }) => (
                  <InputCurrency
                    variant="field"
                    disabled={financialLocked}
                    value={Number.isFinite(field.value) ? field.value : 0}
                    onChange={field.onChange}
                  />
                )}
              />
            </Field>
            <Field
              label="Deducoes/retencoes"
              error={errors.otherDeductions?.message}
            >
              <Controller
                control={control}
                name="otherDeductions"
                render={({ field }) => (
                  <InputCurrency
                    variant="field"
                    disabled={financialLocked}
                    value={Number.isFinite(field.value) ? field.value : 0}
                    onChange={field.onChange}
                  />
                )}
              />
            </Field>
            <Summary label="Valor bruto" value={grossAmount} />
            <Summary label="A receber" value={netReceivable} emphasis />
          </section>

          {status === "CANCELLED" && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-400/5 p-4 text-sm text-amber-100">
              <IconAlertTriangle className="mt-0.5 size-5 shrink-0" />
              A nota cancelada deixara de compor faturamento, impostos e
              contas a receber.
            </div>
          )}

          <Field label="Observacoes da nota">
            <Textarea
              placeholder="Retencoes, protocolo ou contexto fiscal"
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
              <IconReceiptTax />
              {isEditing ? "Salvar nota" : "Registrar nota"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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

function Summary({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-black/10 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-2 text-xl font-semibold ${
          emphasis ? "text-emerald-300" : ""
        }`}
      >
        {formatCurrency(value)}
      </p>
    </div>
  );
}
