import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconAlertTriangle,
  IconPackageExport,
  IconTruckDelivery,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { QueryKeys } from "@/app/config/QueryKeys";
import type { Delivery } from "@/app/entities/Delivery";
import type { PurchaseOrder } from "@/app/entities/PurchaseOrder";
import { useAuth } from "@/app/hooks/useAuth";
import { deliveryService } from "@/app/services/deliveryService";
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
  deliveredQuantity: z.number().nonnegative(),
  notes: z.string().trim().max(4000),
});

const deliverySchema = z
  .object({
    status: z.enum([
      "PREPARING",
      "DISPATCHED",
      "DELIVERED",
      "CANCELLED",
    ]),
    dispatchedAt: z.string(),
    deliveredAt: z.string(),
    freightCost: z.number().nonnegative(),
    notes: z.string().trim().max(8000),
    items: z.array(itemSchema),
  })
  .superRefine((data, context) => {
    if (!data.items.some((item) => item.selected)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: "Selecione ao menos um item para a entrega.",
      });
    }

    data.items.forEach((item, index) => {
      if (item.selected && item.deliveredQuantity <= 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "deliveredQuantity"],
          message: "Informe uma quantidade maior que zero.",
        });
      }
    });

    if (data.status === "DISPATCHED" && !data.dispatchedAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dispatchedAt"],
        message: "Informe a data do envio.",
      });
    }

    if (data.status === "DELIVERED" && !data.deliveredAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deliveredAt"],
        message: "Informe a data da entrega.",
      });
    }
  });

type DeliveryFormData = z.infer<typeof deliverySchema>;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder;
  delivery?: Delivery | null;
  initialPurchaseOrderItemId?: string | null;
};

function makeValues(
  order: PurchaseOrder,
  delivery?: Delivery | null,
  initialPurchaseOrderItemId?: string | null
): DeliveryFormData {
  const currentItems = new Map(
    delivery?.items.map((item) => [item.purchaseOrderItemId, item]) ?? []
  );
  const firstAvailable =
    initialPurchaseOrderItemId ??
    order.items.find((item) => item.availableForDeliveryQuantity > 0)?.id;

  return {
    status: delivery?.status ?? "PREPARING",
    dispatchedAt: delivery?.dispatchedAt?.slice(0, 10) ?? "",
    deliveredAt: delivery?.deliveredAt?.slice(0, 10) ?? "",
    freightCost: delivery?.freightCost ?? 0,
    notes: delivery?.notes ?? "",
    items: order.items.map((item) => {
      const current = currentItems.get(item.id ?? "");
      const available =
        item.availableForDeliveryQuantity +
        (current?.deliveredQuantity ?? 0);
      const selected =
        Boolean(current) ||
        (!delivery && item.id === firstAvailable && available > 0);

      return {
        purchaseOrderItemId: item.id ?? "",
        selected,
        deliveredQuantity:
          current?.deliveredQuantity ?? (selected ? available : 0),
        notes: current?.notes ?? "",
      };
    }),
  };
}

function optionalDate(value: string) {
  return value ? new Date(`${value}T12:00:00`).toISOString() : null;
}

export function DeliveryModal({
  isOpen,
  onClose,
  order,
  delivery,
  initialPurchaseOrderItemId,
}: Props) {
  const { selectedEntityId } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = Boolean(delivery);
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<DeliveryFormData>({
    resolver: zodResolver(deliverySchema),
    defaultValues: makeValues(
      order,
      delivery,
      initialPurchaseOrderItemId
    ),
  });

  useEffect(() => {
    if (isOpen) {
      reset(makeValues(order, delivery, initialPurchaseOrderItemId));
    }
  }, [delivery, initialPurchaseOrderItemId, isOpen, order, reset]);

  const createMutation = useMutation({ mutationFn: deliveryService.create });
  const updateMutation = useMutation({ mutationFn: deliveryService.update });
  const items = watch("items") ?? [];
  const status = watch("status");
  const freightCost = watch("freightCost") || 0;

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.DELIVERIES, selectedEntityId, order.id],
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
    if (!selectedEntityId) {
      return;
    }

    const payload = {
      entityId: selectedEntityId,
      purchaseOrderId: order.id,
      status: values.status,
      dispatchedAt: optionalDate(values.dispatchedAt),
      deliveredAt: optionalDate(values.deliveredAt),
      freightCost: values.freightCost || (delivery ? 0 : undefined),
      notes: values.notes.trim() || (delivery ? null : undefined),
      items: values.items
        .filter((item) => item.selected)
        .map((item) => ({
          purchaseOrderItemId: item.purchaseOrderItemId,
          deliveredQuantity: item.deliveredQuantity,
          notes: item.notes.trim() || undefined,
        })),
    };

    try {
      if (delivery) {
        await updateMutation.mutateAsync({
          ...payload,
          deliveryId: delivery.id,
        });
        toast.success("Entrega atualizada.");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Lote de entrega criado.");
      }

      await refresh();
      onClose();
    } catch (error) {
      treatAxiosError(error);
    }
  });

  const selectedQuantity = items
    .filter((item) => item.selected)
    .reduce((total, item) => total + (item.deliveredQuantity || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconPackageExport className="size-5 text-emerald-400" />
            {isEditing ? "Editar entrega" : "Nova entrega"}
          </DialogTitle>
          <DialogDescription>
            Separe somente quantidades ja recebidas. O lote pode ser
            preparado, colocado em deslocamento ou concluido.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <section className="grid gap-4 rounded-2xl border bg-muted/10 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Situacao" error={errors.status?.message}>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PREPARING">Em preparacao</SelectItem>
                      <SelectItem value="DISPATCHED">Em deslocamento</SelectItem>
                      <SelectItem value="DELIVERED">Entregue</SelectItem>
                      {isEditing && (
                        <SelectItem value="CANCELLED">Cancelada</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field
              label="Data da saida"
              error={errors.dispatchedAt?.message}
            >
              <Input type="date" {...register("dispatchedAt")} />
            </Field>
            <Field
              label="Data da entrega"
              error={errors.deliveredAt?.message}
            >
              <Input type="date" {...register("deliveredAt")} />
            </Field>
            <Field label="Custo do frete (opcional)">
              <Controller
                control={control}
                name="freightCost"
                render={({ field }) => (
                  <InputCurrency
                    variant="field"
                    value={Number.isFinite(field.value) ? field.value : 0}
                    onChange={field.onChange}
                  />
                )}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Deixe em zero quando a entrega for realizada pela propria
                empresa.
              </p>
            </Field>
          </section>

          <section className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="font-semibold">Itens da entrega</h3>
                <p className="text-sm text-muted-foreground">
                  Disponibilidade calculada pelos recebimentos confirmados.
                </p>
              </div>
              <div className="rounded-xl border px-3 py-2 text-sm">
                {selectedQuantity.toLocaleString("pt-BR")} unidades -{" "}
                {freightCost > 0 ? (
                  <>
                    frete <strong>{formatCurrency(freightCost)}</strong>
                  </>
                ) : (
                  "entrega propria / sem custo"
                )}
              </div>
            </div>

            {order.items.map((item, index) => {
              const current = delivery?.items.find(
                (entry) => entry.purchaseOrderItemId === item.id
              );
              const available =
                item.availableForDeliveryQuantity +
                (current?.deliveredQuantity ?? 0);
              const selected = items[index]?.selected;

              return (
                <div key={item.id} className="rounded-2xl border p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      disabled={available <= 0}
                      className="mt-1 size-4 accent-emerald-500"
                      {...register(`items.${index}.selected`)}
                    />
                    <span className="min-w-0">
                      <span className="block font-medium">
                        {item.lineNumber}. {item.description}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Disponivel: {available.toLocaleString("pt-BR")}{" "}
                        {item.originalUnit}
                      </span>
                    </span>
                  </label>
                  <input
                    type="hidden"
                    {...register(`items.${index}.purchaseOrderItemId`)}
                  />
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Field
                      label="Quantidade"
                      error={
                        errors.items?.[index]?.deliveredQuantity?.message
                      }
                    >
                      <Input
                        type="number"
                        min="0"
                        max={available}
                        step="0.001"
                        disabled={!selected}
                        {...register(`items.${index}.deliveredQuantity`, {
                          valueAsNumber: true,
                        })}
                      />
                    </Field>
                    <Field label="Observacoes do item">
                      <Input
                        disabled={!selected}
                        placeholder="Volume, lote ou ressalva"
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

          {status === "CANCELLED" && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-400/5 p-4 text-sm text-amber-100">
              <IconAlertTriangle className="mt-0.5 size-5 shrink-0" />
              A entrega deixara de reservar quantidades e de compor o custo
              logistico da ordem.
            </div>
          )}

          <Field label="Observacoes gerais (opcional)">
            <Textarea
              placeholder="Ocorrencia ou observacao da entrega"
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
              <IconTruckDelivery />
              {isEditing ? "Salvar entrega" : "Criar entrega"}
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
