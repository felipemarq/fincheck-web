import { zodResolver } from "@hookform/resolvers/zod";
import { IconCashBanknote, IconCircleCheck } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { QueryKeys } from "@/app/config/QueryKeys";
import type {
  Invoice,
  ReceivablePayment,
} from "@/app/entities/Invoice";
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

const paymentSchema = z.object({
  receivedAt: z.string().min(1, "Informe a data."),
  amount: z.number().positive("Informe um valor maior que zero."),
  paymentMethod: z.string().trim().min(1, "Informe a forma de recebimento."),
  reference: z.string().trim().max(160),
  status: z.enum(["CONFIRMED", "CANCELLED"]),
  notes: z.string().trim().max(4000),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrderId: string;
  invoice: Invoice | null;
  payment?: ReceivablePayment | null;
};

function makeValues(
  invoice: Invoice,
  payment?: ReceivablePayment | null
): PaymentFormData {
  return {
    receivedAt:
      payment?.receivedAt.slice(0, 10) ??
      new Date().toISOString().slice(0, 10),
    amount: payment?.amount ?? invoice.outstandingAmount,
    paymentMethod: payment?.paymentMethod ?? "PIX",
    reference: payment?.reference ?? "",
    status: payment?.status ?? "CONFIRMED",
    notes: payment?.notes ?? "",
  };
}

export function ReceivablePaymentModal({
  isOpen,
  onClose,
  purchaseOrderId,
  invoice,
  payment,
}: Props) {
  const { selectedEntityId } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = Boolean(payment);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: invoice ? makeValues(invoice, payment) : undefined,
  });

  useEffect(() => {
    if (isOpen && invoice) {
      reset(makeValues(invoice, payment));
    }
  }, [invoice, isOpen, payment, reset]);

  const createMutation = useMutation({
    mutationFn: invoiceService.createPayment,
  });
  const updateMutation = useMutation({
    mutationFn: invoiceService.updatePayment,
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: [
          QueryKeys.INVOICES,
          selectedEntityId,
          purchaseOrderId,
        ],
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
    if (!selectedEntityId || !invoice) {
      return;
    }

    const payload = {
      entityId: selectedEntityId,
      purchaseOrderId,
      invoiceId: invoice.id,
      receivedAt: new Date(
        `${values.receivedAt}T12:00:00`
      ).toISOString(),
      amount: values.amount,
      paymentMethod: values.paymentMethod,
      reference: values.reference.trim() || null,
      notes: values.notes.trim() || null,
    };

    try {
      if (payment) {
        await updateMutation.mutateAsync({
          ...payload,
          paymentId: payment.id,
          status: values.status,
        });
        toast.success("Recebimento atualizado.");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Pagamento recebido.");
      }

      await refresh();
      onClose();
    } catch (error) {
      treatAxiosError(error);
    }
  });

  if (!invoice) {
    return null;
  }

  const available =
    invoice.outstandingAmount +
    (payment?.status === "CONFIRMED" ? payment.amount : 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconCashBanknote className="size-5 text-emerald-400" />
            {isEditing ? "Editar recebimento" : "Registrar recebimento"}
          </DialogTitle>
          <DialogDescription>
            Nota {invoice.invoiceNumber} - saldo disponivel{" "}
            {formatCurrency(available)}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Data" error={errors.receivedAt?.message}>
              <Input type="date" {...register("receivedAt")} />
            </Field>
            <Field label="Valor" error={errors.amount?.message}>
              <Controller
                control={control}
                name="amount"
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
              label="Forma de recebimento"
              error={errors.paymentMethod?.message}
            >
              <Input placeholder="PIX, TED, boleto..." {...register("paymentMethod")} />
            </Field>
            <Field label="Referencia">
              <Input placeholder="Comprovante ou protocolo" {...register("reference")} />
            </Field>
            {isEditing && (
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
                        <SelectItem value="CONFIRMED">Confirmado</SelectItem>
                        <SelectItem value="CANCELLED">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            )}
          </div>

          <Field label="Observacoes">
            <Textarea
              placeholder="Conta de destino ou conciliacao"
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
              <IconCircleCheck />
              {isEditing ? "Salvar recebimento" : "Confirmar recebimento"}
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
