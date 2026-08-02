import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconCalendarCheck,
  IconEdit,
  IconPackageImport,
  IconX,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { QueryKeys } from "@/app/config/QueryKeys";
import type { Acquisition } from "@/app/entities/Acquisition";
import type { AcquisitionReceipt } from "@/app/entities/AcquisitionReceipt";
import type { PurchaseOrder } from "@/app/entities/PurchaseOrder";
import { useAcquisitionReceipts } from "@/app/hooks/useAcquisitionReceipts";
import { useAuth } from "@/app/hooks/useAuth";
import { receiptService } from "@/app/services/receiptService";
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
import { Textarea } from "@/components/ui/textarea";

const itemSchema = z.object({
  acquisitionItemId: z.string().min(1),
  purchaseOrderItemId: z.string().min(1),
  selected: z.boolean(),
  receivedQuantity: z.number().nonnegative(),
  notes: z.string().trim().max(4000),
});

const receiptSchema = z
  .object({
    receivedAt: z.string().min(1, "Informe a data da chegada."),
    notes: z.string().trim().max(8000),
    items: z.array(itemSchema),
  })
  .superRefine((data, context) => {
    const selected = data.items.filter((item) => item.selected);

    if (!selected.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: "Selecione ao menos um item recebido.",
      });
    }

    selected.forEach((item, index) => {
      if (item.receivedQuantity <= 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "receivedQuantity"],
          message: "Informe uma quantidade maior que zero.",
        });
      }
    });
  });

type ReceiptFormData = z.infer<typeof receiptSchema>;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder;
  acquisition: Acquisition | null;
};

const EMPTY_RECEIPTS: AcquisitionReceipt[] = [];

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function makeValues(
  acquisition: Acquisition,
  receipts: AcquisitionReceipt[],
  editing?: AcquisitionReceipt | null
): ReceiptFormData {
  const receivedByAcquisitionItem = new Map<string, number>();

  receipts
    .filter(
      (receipt) =>
        receipt.status === "CONFIRMED" && receipt.id !== editing?.id
    )
    .flatMap((receipt) => receipt.items)
    .forEach((item) => {
      receivedByAcquisitionItem.set(
        item.acquisitionItemId,
        (receivedByAcquisitionItem.get(item.acquisitionItemId) ?? 0) +
          item.receivedQuantity
      );
    });

  const editingByAcquisitionItem = new Map(
    editing?.items.map((item) => [item.acquisitionItemId, item]) ?? []
  );

  return {
    receivedAt: editing?.receivedAt.slice(0, 10) ?? todayInput(),
    notes: editing?.notes ?? "",
    items: acquisition.items.map((item) => {
      const current = editingByAcquisitionItem.get(item.id ?? "");
      const remaining = Math.max(
        item.acquiredQuantity -
          (receivedByAcquisitionItem.get(item.id ?? "") ?? 0),
        0
      );

      return {
        acquisitionItemId: item.id ?? "",
        purchaseOrderItemId: item.purchaseOrderItemId,
        selected: Boolean(current) || (!editing && remaining > 0),
        receivedQuantity: current?.receivedQuantity ?? remaining,
        notes: current?.notes ?? "",
      };
    }),
  };
}

export function AcquisitionReceiptModal({
  isOpen,
  onClose,
  order,
  acquisition,
}: Props) {
  const { selectedEntityId } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AcquisitionReceipt | null>(null);
  const receiptQuery = useAcquisitionReceipts(
    {
      entityId: selectedEntityId ?? "",
      purchaseOrderId: order.id,
      acquisitionId: acquisition?.id ?? "",
    },
    isOpen && Boolean(acquisition?.id && selectedEntityId)
  );
  const receipts = receiptQuery.receipts ?? EMPTY_RECEIPTS;
  const { isFetchingReceipts, isError } = receiptQuery;
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ReceiptFormData>({
    resolver: zodResolver(receiptSchema),
    defaultValues: acquisition
      ? makeValues(acquisition, [], null)
      : undefined,
  });

  useEffect(() => {
    if (!isOpen || !acquisition) {
      return;
    }

    reset(makeValues(acquisition, receipts, editing));
  }, [acquisition, editing, isOpen, receipts, reset]);

  useEffect(() => {
    if (!isOpen) {
      setEditing(null);
    }
  }, [isOpen]);

  const createMutation = useMutation({ mutationFn: receiptService.create });
  const updateMutation = useMutation({ mutationFn: receiptService.update });
  const watchedItems = watch("items") ?? [];

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: [
          QueryKeys.ACQUISITION_RECEIPTS,
          selectedEntityId,
          order.id,
          acquisition?.id,
        ],
      }),
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.ACQUISITIONS, selectedEntityId, order.id],
      }),
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.PURCHASE_ORDERS, selectedEntityId],
      }),
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.OPERATIONS_DASHBOARD, selectedEntityId],
      }),
    ]);
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!selectedEntityId || !acquisition) {
      return;
    }

    const payload = {
      entityId: selectedEntityId,
      purchaseOrderId: order.id,
      acquisitionId: acquisition.id,
      receivedAt: new Date(
        `${values.receivedAt}T12:00:00`
      ).toISOString(),
      notes: values.notes.trim() || (editing ? null : undefined),
      items: values.items
        .filter((item) => item.selected)
        .map((item) => ({
          acquisitionItemId: item.acquisitionItemId,
          purchaseOrderItemId: item.purchaseOrderItemId,
          receivedQuantity: item.receivedQuantity,
          notes: item.notes.trim() || undefined,
        })),
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({
          ...payload,
          receiptId: editing.id,
        });
        toast.success("Recebimento atualizado.");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Chegada registrada.");
      }

      setEditing(null);
      await refresh();
    } catch (error) {
      treatAxiosError(error);
    }
  });

  const cancelReceipt = async () => {
    if (!selectedEntityId || !acquisition || !editing) {
      return;
    }

    try {
      await updateMutation.mutateAsync({
        entityId: selectedEntityId,
        purchaseOrderId: order.id,
        acquisitionId: acquisition.id,
        receiptId: editing.id,
        status: "CANCELLED",
      });
      toast.success("Recebimento cancelado.");
      setEditing(null);
      await refresh();
    } catch (error) {
      treatAxiosError(error);
    }
  };

  if (!acquisition) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconPackageImport className="size-5 text-emerald-400" />
            Recebimento da compra
          </DialogTitle>
          <DialogDescription>
            Registre chegadas parciais ou totais sem alterar a quantidade
            originalmente comprada.
          </DialogDescription>
        </DialogHeader>

        <section className="rounded-2xl border bg-muted/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">
                {acquisition.sellerName || "Compra sem vendedor informado"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {acquisition.items.length} itens - compra de{" "}
                {new Date(acquisition.purchasedAt).toLocaleDateString(
                  "pt-BR"
                )}
              </p>
            </div>
            {editing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditing(null)}
              >
                <IconX />
                Nova chegada
              </Button>
            )}
          </div>

          {isFetchingReceipts && (
            <p className="mt-4 text-sm text-muted-foreground">
              Carregando historico...
            </p>
          )}
          {isError && (
            <p className="mt-4 text-sm text-destructive">
              Nao foi possivel carregar o historico.
            </p>
          )}
          {receipts.length > 0 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {receipts.map((receipt) => (
                <button
                  key={receipt.id}
                  type="button"
                  disabled={receipt.status === "CANCELLED"}
                  onClick={() => setEditing(receipt)}
                  className="flex items-center justify-between rounded-xl border bg-background/30 p-3 text-left disabled:opacity-50"
                >
                  <span>
                    <span className="block text-sm font-medium">
                      {new Date(receipt.receivedAt).toLocaleDateString(
                        "pt-BR"
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {receipt.totalQuantity.toLocaleString("pt-BR")} unidades
                      {receipt.status === "CANCELLED" ? " - cancelado" : ""}
                    </span>
                  </span>
                  {receipt.status !== "CANCELLED" && (
                    <IconEdit className="size-4" />
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Data da chegada" error={errors.receivedAt?.message}>
              <Input type="date" {...register("receivedAt")} />
            </Field>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 text-sm text-muted-foreground">
              <IconCalendarCheck className="mb-2 size-5 text-emerald-400" />
              O status da compra sera atualizado automaticamente pelas
              quantidades recebidas.
            </div>
          </div>

          <section className="space-y-3">
            <div>
              <h3 className="font-semibold">Itens que chegaram</h3>
              <p className="text-sm text-muted-foreground">
                Selecione somente o que foi conferido fisicamente.
              </p>
            </div>
            {acquisition.items.map((item, index) => {
              const selected = watchedItems[index]?.selected;
              return (
                <div
                  key={item.id ?? item.purchaseOrderItemId}
                  className="rounded-2xl border p-4"
                >
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-emerald-500"
                      {...register(`items.${index}.selected`)}
                    />
                    <span>
                      <span className="block font-medium">
                        {item.lineNumber}. {item.description}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Comprado:{" "}
                        {item.acquiredQuantity.toLocaleString("pt-BR")}{" "}
                        {item.originalUnit}
                      </span>
                    </span>
                  </label>
                  <input
                    type="hidden"
                    {...register(`items.${index}.acquisitionItemId`)}
                  />
                  <input
                    type="hidden"
                    {...register(`items.${index}.purchaseOrderItemId`)}
                  />
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Field
                      label="Quantidade recebida"
                      error={
                        errors.items?.[index]?.receivedQuantity?.message
                      }
                    >
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        disabled={!selected}
                        {...register(`items.${index}.receivedQuantity`, {
                          valueAsNumber: true,
                        })}
                      />
                    </Field>
                    <Field label="Observacoes do item">
                      <Input
                        disabled={!selected}
                        placeholder="Avaria, lote ou conferencia"
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

          <Field label="Observacoes gerais">
            <Textarea
              placeholder="Transportadora, volume ou ocorrencia"
              {...register("notes")}
            />
          </Field>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <div>
              {editing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={cancelReceipt}
                  isLoading={updateMutation.isPending}
                >
                  Cancelar recebimento
                </Button>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={onClose}>
                Fechar
              </Button>
              <Button
                type="submit"
                isLoading={
                  createMutation.isPending || updateMutation.isPending
                }
              >
                {editing ? "Salvar recebimento" : "Registrar chegada"}
              </Button>
            </div>
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
