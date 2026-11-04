import { zodResolver } from "@hookform/resolvers/zod";
import { IconFileInvoice, IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { QueryKeys } from "@/app/config/QueryKeys";
import type { Invoice } from "@/app/entities/Invoice";
import { useAuth } from "@/app/hooks/useAuth";
import { useCustomers } from "@/app/hooks/useCustomers";
import { useInvoices } from "@/app/hooks/useInvoices";
import { invoiceService } from "@/app/services/invoiceService";
import { treatAxiosError } from "@/app/utils/treatAxiosError";
import { todayDateInput } from "@/app/utils/todayDateInput";
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
import { formatCurrency } from "@/view/pages/PurchaseOrders/purchaseOrderPresentation";

const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;
const itemSchema = z.object({
  id: z.string().optional(),
  description: z.string().trim().min(1, "Informe a descrição.").max(4000),
  originalUnit: z.string().trim().min(1, "Informe a unidade.").max(40),
  invoicedQuantity: z
    .number()
    .positive("Informe uma quantidade maior que zero.")
    .max(99_999_999_999)
    .multipleOf(0.001),
  unitPrice: z
    .number()
    .nonnegative("O preço não pode ser negativo.")
    .max(9_999_999_999)
    .multipleOf(0.000001),
  notes: z.string().trim().max(4000),
});
const schema = z
  .object({
    customerId: z.string().min(1, "Selecione o cliente."),
    operationType: z.enum(["SALE", "SALES_RETURN", "PURCHASE_RETURN"]),
    referencedInvoiceId: z.string(),
    invoiceNumber: z
      .string()
      .trim()
      .min(1, "Informe o número da nota.")
      .max(120),
    issuedAt: z.string().min(1, "Informe a emissão."),
    dueAt: z.string().min(1, "Informe o vencimento."),
    status: z.enum(["DRAFT", "ISSUED", "CANCELLED"]),
    taxAmount: z.number().nonnegative().max(9_999_999_999).multipleOf(0.01),
    otherDeductions: z
      .number()
      .nonnegative()
      .max(9_999_999_999)
      .multipleOf(0.01),
    notes: z.string().trim().max(8000),
    items: z.array(itemSchema).min(1, "Inclua ao menos um item."),
  })
  .superRefine((value, ctx) => {
    if (value.dueAt < value.issuedAt) {
      ctx.addIssue({
        code: "custom",
        path: ["dueAt"],
        message: "O vencimento deve ser igual ou posterior à emissão.",
      });
    }
    const gross = roundMoney(
      value.items.reduce(
        (sum, item) => sum + roundMoney(item.invoicedQuantity * item.unitPrice),
        0,
      ),
    );
    if (value.otherDeductions > gross) {
      ctx.addIssue({
        code: "custom",
        path: ["otherDeductions"],
        message: "As deduções não podem ultrapassar o total da nota.",
      });
    }
  });
type FormData = z.infer<typeof schema>;
const emptyItem = () => ({
  description: "",
  originalUnit: "UN",
  invoicedQuantity: 1,
  unitPrice: 0,
  notes: "",
});

function after30Days(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 30);
  return date.toISOString().slice(0, 10);
}

function makeValues(invoice?: Invoice): FormData {
  const issuedAt = invoice?.issuedAt.slice(0, 10) ?? todayDateInput();
  return {
    customerId: invoice?.customerId ?? "",
    operationType: invoice?.operationType ?? "SALE",
    referencedInvoiceId: invoice?.referencedInvoiceId ?? "",
    invoiceNumber: invoice?.invoiceNumber ?? "",
    issuedAt,
    dueAt: invoice?.dueAt.slice(0, 10) ?? after30Days(issuedAt),
    status: invoice?.status ?? "ISSUED",
    taxAmount: invoice?.taxAmount ?? 0,
    otherDeductions: invoice?.otherDeductions ?? 0,
    notes: invoice?.notes ?? "",
    items: invoice?.items.map((item) => ({
      id: item.id,
      description: item.description,
      originalUnit: item.originalUnit,
      invoicedQuantity: item.invoicedQuantity,
      unitPrice: item.unitPrice,
      notes: item.notes ?? "",
    })) ?? [emptyItem()],
  };
}

export function StandaloneInvoiceModal({
  invoice,
  onClose,
  orderChoice,
}: {
  invoice?: Invoice;
  onClose: () => void;
  orderChoice?: React.ReactNode;
}) {
  const { selectedEntityId } = useAuth();
  const queryClient = useQueryClient();
  const customersQuery = useCustomers({ entityId: selectedEntityId ?? "" });
  const financialLocked = Boolean(invoice && (invoice.receivedAmount > 0 || invoice.returnedAmount > 0));
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: makeValues(invoice),
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const values = useWatch({ control });
  const sourceInvoices = useInvoices({entityId: selectedEntityId ?? ""}, values.operationType === "SALES_RETURN");
  const gross = roundMoney(
    (values.items ?? []).reduce(
      (sum, item) =>
        sum + roundMoney((item.invoicedQuantity ?? 0) * (item.unitPrice ?? 0)),
      0,
    ),
  );
  const net = values.operationType === "SALE" ? Math.max(roundMoney(gross - (values.otherDeductions ?? 0) - (invoice?.returnedAmount ?? 0)), 0) : 0;
  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!selectedEntityId) throw new Error("Selecione uma organização.");
      const payload = {
        ...data,
        referencedInvoiceId: data.operationType === "SALES_RETURN" && data.referencedInvoiceId ? data.referencedInvoiceId : invoice ? null : undefined,
        entityId: selectedEntityId,
        issuedAt: `${data.issuedAt}T12:00:00.000Z`,
        dueAt: `${data.dueAt}T12:00:00.000Z`,
        notes: data.notes || null,
      };
      if (invoice) {
        return invoiceService.update(
          financialLocked
            ? {
                entityId: selectedEntityId,
                invoiceId: invoice.id,
                dueAt: payload.dueAt,
                notes: payload.notes,
              }
            : { ...payload, invoiceId: invoice.id },
        );
      }
      return invoiceService.create(payload);
    },
    onSuccess: async () => {
      await Promise.all(
        [
          QueryKeys.INVOICES,
          QueryKeys.RECEIVABLES,
          QueryKeys.OPERATIONS_DASHBOARD,
          QueryKeys.PURCHASE_ORDERS,
        ].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key, selectedEntityId] }),
        ),
      );
      toast.success(
        invoice ? "Nota fiscal atualizada." : "Nota fiscal cadastrada.",
      );
      onClose();
    },
    onError: treatAxiosError,
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && !mutation.isPending && onClose()}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconFileInvoice className="size-5 text-emerald-400" />
            {invoice ? "Editar nota fiscal" : "Cadastrar nota fiscal"}
          </DialogTitle>
          <DialogDescription>
            Registre cliente, itens e vencimento. O vínculo com uma ordem de
            compra é opcional.
          </DialogDescription>
        </DialogHeader>
        {orderChoice}
        {financialLocked && (
          <p className="rounded-xl border border-amber-400/25 bg-amber-500/5 p-3 text-sm">
            Esta nota já possui recebimentos. Você pode ajustar o vencimento e
            as observações.
          </p>
        )}
        {customersQuery.isError && (
          <p className="text-sm text-destructive">
            Não foi possível carregar os clientes.{" "}
            <Button variant="link" onClick={() => customersQuery.refetch()}>
              Tentar novamente
            </Button>
          </p>
        )}
        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="space-y-5"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Tipo de nota">
              <Controller control={control} name="operationType" render={({field}) => <Select value={field.value} disabled={financialLocked} onValueChange={value=>{field.onChange(value);setValue("referencedInvoiceId", "");}}>
                <SelectTrigger aria-label="Tipo de nota" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="SALE">Venda</SelectItem><SelectItem value="SALES_RETURN">Devolução de venda</SelectItem><SelectItem value="PURCHASE_RETURN">Devolução de compra</SelectItem></SelectContent>
              </Select>} />
            </Field>
            <Field label="Cliente" error={errors.customerId?.message}>
              <Controller
                control={control}
                name="customerId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={financialLocked || customersQuery.isLoading}
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-label="Cliente da nota"
                    >
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {customersQuery.customers?.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.tradeName || customer.legalName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {!customersQuery.isLoading &&
                !customersQuery.isError &&
                !customersQuery.customers?.length && (
                  <p className="text-xs text-muted-foreground">
                    Cadastre o cliente na área Clientes para continuar.
                  </p>
                )}
            </Field>
            <Field label="Número da nota" error={errors.invoiceNumber?.message}>
              <Input
                aria-label="Número da nota"
                disabled={financialLocked}
                {...register("invoiceNumber")}
              />
            </Field>
            <Field label="Situação">
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={financialLocked}
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-label="Situação da nota"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ISSUED">Emitida</SelectItem>
                      <SelectItem value="DRAFT">Rascunho</SelectItem>
                      {invoice && (
                        <SelectItem value="CANCELLED">Cancelada</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Emissão" error={errors.issuedAt?.message}>
              <Input
                aria-label="Emissão"
                type="date"
                disabled={financialLocked}
                {...register("issuedAt", {
                  onChange: (event) => {
                    if (!invoice && !dirtyFields.dueAt && event.target.value)
                      setValue("dueAt", after30Days(event.target.value));
                  },
                })}
              />
            </Field>
            <Field label="Vencimento" error={errors.dueAt?.message}>
              <Input
                aria-label="Vencimento"
                type="date"
                {...register("dueAt")}
              />
            </Field>
          </div>
          {values.operationType === "SALES_RETURN" && <Field label="Venda original (opcional)">
            <Controller control={control} name="referencedInvoiceId" render={({field}) => <Select value={field.value || "none"} disabled={financialLocked || sourceInvoices.isLoading} onValueChange={value=>field.onChange(value === "none" ? "" : value)}>
              <SelectTrigger className="w-full" aria-label="Venda original"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">Vínculo a conferir</SelectItem>{sourceInvoices.invoices?.filter(source=>source.id!==invoice?.id && source.customerId===values.customerId && source.operationType === "SALE" && source.status === "ISSUED").map(source=><SelectItem key={source.id} value={source.id}>Nota {source.invoiceNumber} — {formatCurrency(source.documentAmount)}</SelectItem>)}</SelectContent>
            </Select>} />
            <p className="text-xs text-muted-foreground">O vínculo abate o valor devolvido do saldo da venda. Sem vínculo, confira a origem antes de cobrar o cliente.</p>
            {sourceInvoices.isError && <p className="text-xs text-destructive">Não foi possível carregar as vendas. <Button type="button" variant="link" onClick={()=>sourceInvoices.refetch()}>Tentar novamente</Button></p>}
          </Field>}
          <div className="space-y-3">
            <h3 className="font-semibold">Itens da nota</h3>
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-3 rounded-xl border p-4">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_6rem_auto]">
                  <Field
                    label={`Descrição do item ${index + 1}`}
                    error={errors.items?.[index]?.description?.message}
                  >
                    <Input
                      aria-label={`Descrição do item ${index + 1}`}
                      disabled={financialLocked}
                      {...register(`items.${index}.description`)}
                    />
                  </Field>
                  <Field
                    label="Unidade"
                    error={errors.items?.[index]?.originalUnit?.message}
                  >
                    <Input
                      aria-label={`Unidade do item ${index + 1}`}
                      disabled={financialLocked}
                      {...register(`items.${index}.originalUnit`)}
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-6"
                    disabled={financialLocked || fields.length === 1}
                    aria-label={`Remover item ${index + 1}`}
                    onClick={() => remove(index)}
                  >
                    <IconTrash />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field
                    label="Quantidade"
                    error={errors.items?.[index]?.invoicedQuantity?.message}
                  >
                    <Input
                      aria-label={`Quantidade do item ${index + 1}`}
                      type="number"
                      min="0.001"
                      step="0.001"
                      disabled={financialLocked}
                      {...register(`items.${index}.invoicedQuantity`, {
                        valueAsNumber: true,
                      })}
                    />
                  </Field>
                  <Field
                    label="Valor unitário (R$)"
                    error={errors.items?.[index]?.unitPrice?.message}
                  >
                    <Input
                      aria-label={`Valor unitário do item ${index + 1}`}
                      type="number"
                      min="0"
                      step="0.000001"
                      disabled={financialLocked}
                      {...register(`items.${index}.unitPrice`, {
                        valueAsNumber: true,
                      })}
                    />
                  </Field>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Total do item</p>
                    <p className="py-2 font-semibold">
                      {formatCurrency(
                        roundMoney(
                          (values.items?.[index]?.invoicedQuantity ?? 0) *
                            (values.items?.[index]?.unitPrice ?? 0),
                        ),
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {errors.items?.message && (
              <p className="text-xs text-destructive">{errors.items.message}</p>
            )}
            {!financialLocked && (
              <Button
                type="button"
                variant="outline"
                onClick={() => append(emptyItem())}
              >
                <IconPlus /> Adicionar item
              </Button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Impostos / custo fiscal (R$)"
              error={errors.taxAmount?.message}
            >
              <Input
                aria-label="Impostos"
                type="number"
                min="0"
                step="0.01"
                disabled={financialLocked}
                {...register("taxAmount", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                Custo fiscal, sem desconto no saldo do cliente.
              </p>
            </Field>
            <Field
              label="Deduções do recebível (R$)"
              error={errors.otherDeductions?.message}
            >
              <Input
                aria-label="Deduções"
                type="number"
                min="0"
                step="0.01"
                disabled={financialLocked}
                {...register("otherDeductions", { valueAsNumber: true })}
              />
            </Field>
          </div>
          <div className="flex flex-wrap justify-between gap-3 rounded-xl border bg-muted/20 p-4 text-sm">
            <span>
              Valor bruto: <strong>{formatCurrency(gross)}</strong>
            </span>
            <span>
              Valor a receber:{" "}
              <strong className="text-emerald-400">
                {formatCurrency(net)}
              </strong>
            </span>
          </div>
          <Field label="Observações" error={errors.notes?.message}>
            <Textarea aria-label="Observações da nota" {...register("notes")} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={mutation.isPending}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={mutation.isPending}>
              {invoice ? "Salvar nota" : "Cadastrar nota"}
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
