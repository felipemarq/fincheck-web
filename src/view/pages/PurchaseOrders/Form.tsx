import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  IconArrowLeft,
  IconCalculator,
  IconDeviceFloppy,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { QueryKeys } from "@/app/config/QueryKeys";
import type { PurchaseOrderInput } from "@/app/entities/PurchaseOrder";
import { useAuth } from "@/app/hooks/useAuth";
import { useCustomers } from "@/app/hooks/useCustomers";
import { usePurchaseOrder } from "@/app/hooks/usePurchaseOrder";
import { purchaseOrderService } from "@/app/services/purchaseOrderService";
import { treatAxiosError } from "@/app/utils/treatAxiosError";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { formatCurrency } from "./purchaseOrderPresentation";

const itemSchema = z.object({
  id: z.string().optional(),
  lineNumber: z.number().int().positive("Use uma linha maior que zero."),
  description: z.string().trim().min(1, "Informe a descricao.").max(4000),
  brand: z.string().trim().min(1, "Informe a marca.").max(120),
  specification: z.string().trim().max(4000),
  originalUnit: z.string().trim().min(1, "Informe a unidade.").max(40),
  normalizedUnit: z
    .string()
    .trim()
    .min(1, "Informe a unidade normalizada.")
    .max(40),
  orderedQuantity: z.number().positive("A quantidade deve ser maior que zero."),
  saleUnitPrice: z.number().nonnegative("O preco nao pode ser negativo."),
  officialTotal: z.number().nonnegative("O total nao pode ser negativo."),
  notes: z.string().trim().max(4000),
});

const orderSchema = z
  .object({
    customerId: z.string().min(1, "Selecione o cliente."),
    orderNumber: z.string().trim().min(1, "Informe o numero da ordem.").max(80),
    externalNumber: z.string().trim().max(80),
    quoteNumber: z.string().trim().max(80),
    requisitionNumber: z.string().trim().max(80),
    issuedAt: z.string().min(1, "Informe a data de emissao."),
    requestedDeliveryAt: z.string(),
    officialTotal: z.number().nonnegative("O total nao pode ser negativo."),
    paymentTerms: z.string().trim().max(4000),
    instructions: z.string().trim().max(8000),
    notes: z.string().trim().max(8000),
    billingAddress: z.string().trim().max(2000),
    deliveryAddress: z.string().trim().max(2000),
    lifecycleStatus: z.enum(["DRAFT", "ACTIVE", "CANCELLED"]),
    items: z.array(itemSchema).min(1, "Adicione ao menos um item."),
  })
  .superRefine((data, context) => {
    const lineNumbers = new Set<number>();

    data.items.forEach((item, index) => {
      if (lineNumbers.has(item.lineNumber)) {
        context.addIssue({
          code: "custom",
          path: ["items", index, "lineNumber"],
          message: "Este numero de linha ja esta em uso.",
        });
      }
      lineNumbers.add(item.lineNumber);
    });
  });

type OrderFormData = z.infer<typeof orderSchema>;

const newItem = (lineNumber: number): OrderFormData["items"][number] => ({
  lineNumber,
  description: "",
  brand: "",
  specification: "",
  originalUnit: "UN",
  normalizedUnit: "UNIT",
  orderedQuantity: 1,
  saleUnitPrice: 0,
  officialTotal: 0,
  notes: "",
});

function getLocalDateInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const initialValues: OrderFormData = {
  customerId: "",
  orderNumber: "",
  externalNumber: "",
  quoteNumber: "",
  requisitionNumber: "",
  issuedAt: getLocalDateInputValue(),
  requestedDeliveryAt: "",
  officialTotal: 0,
  paymentTerms: "",
  instructions: "",
  notes: "",
  billingAddress: "",
  deliveryAddress: "",
  lifecycleStatus: "ACTIVE",
  items: [newItem(1)],
};

function toDateInput(value?: string) {
  return value?.slice(0, 10) ?? "";
}

function toIsoDate(value: string) {
  return new Date(`${value}T12:00:00.000Z`).toISOString();
}

export default function PurchaseOrderForm() {
  const { purchaseOrderId } = useParams();
  const isEditing = Boolean(purchaseOrderId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedEntityId } = useAuth();
  const initializedOrderId = useRef<string | null>(null);

  const { customers, isFetchingCustomers } = useCustomers(
    {
      entityId: selectedEntityId ?? "",
    },
    Boolean(selectedEntityId)
  );
  const activeCustomers = customers?.filter((customer) => customer.active);

  const { order, isFetchingOrder } = usePurchaseOrder(
    {
      entityId: selectedEntityId ?? "",
      purchaseOrderId: purchaseOrderId ?? "",
    },
    Boolean(selectedEntityId && purchaseOrderId)
  );

  const {
    control,
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: initialValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  useEffect(() => {
    if (!order || initializedOrderId.current === order.id) {
      return;
    }

    reset({
      customerId: order.customerId,
      orderNumber: order.orderNumber,
      externalNumber: order.externalNumber ?? "",
      quoteNumber: order.quoteNumber ?? "",
      requisitionNumber: order.requisitionNumber ?? "",
      issuedAt: toDateInput(order.issuedAt),
      requestedDeliveryAt: toDateInput(order.requestedDeliveryAt),
      officialTotal: order.officialTotal,
      paymentTerms: order.paymentTerms ?? "",
      instructions: order.instructions ?? "",
      notes: order.notes ?? "",
      billingAddress: order.billingAddress ?? "",
      deliveryAddress: order.deliveryAddress ?? "",
      lifecycleStatus: order.lifecycleStatus,
      items: order.items.map((item) => ({
        id: item.id,
        lineNumber: item.lineNumber,
        description: item.description,
        brand: item.brand,
        specification: item.specification ?? "",
        originalUnit: item.originalUnit,
        normalizedUnit: item.normalizedUnit,
        orderedQuantity: item.orderedQuantity,
        saleUnitPrice: item.saleUnitPrice,
        officialTotal: item.officialTotal,
        notes: item.notes ?? "",
      })),
    });
    initializedOrderId.current = order.id;
  }, [order, reset]);

  const watchedItems = watch("items");
  const calculatedItemsTotal = watchedItems.reduce(
    (total, item) => total + (Number(item.officialTotal) || 0),
    0
  );
  const officialTotal = watch("officialTotal");
  const hasTotalMismatch =
    Math.round(calculatedItemsTotal * 100) !==
    Math.round((Number(officialTotal) || 0) * 100);

  const createMutation = useMutation({
    mutationFn: purchaseOrderService.create,
  });
  const updateMutation = useMutation({
    mutationFn: purchaseOrderService.update,
  });

  const optionalText = (value: string) => {
    const normalized = value.trim();
    return normalized || (isEditing ? null : undefined);
  };

  const handleCustomerChange = (customerId: string) => {
    setValue("customerId", customerId, { shouldValidate: true });
    const customer = customers?.find((item) => item.id === customerId);

    if (customer) {
      setValue("billingAddress", customer.billingAddress ?? "");
      setValue("deliveryAddress", customer.deliveryAddress ?? "");
    }
  };

  const onSubmit = handleSubmit(async (formData) => {
    if (!selectedEntityId) {
      return;
    }

    const payload: PurchaseOrderInput = {
      customerId: formData.customerId,
      orderNumber: formData.orderNumber.trim(),
      externalNumber: optionalText(formData.externalNumber),
      quoteNumber: optionalText(formData.quoteNumber),
      requisitionNumber: optionalText(formData.requisitionNumber),
      issuedAt: toIsoDate(formData.issuedAt),
      requestedDeliveryAt: formData.requestedDeliveryAt
        ? toIsoDate(formData.requestedDeliveryAt)
        : isEditing
          ? null
          : undefined,
      officialTotal: Number(formData.officialTotal),
      paymentTerms: optionalText(formData.paymentTerms),
      instructions: optionalText(formData.instructions),
      notes: optionalText(formData.notes),
      billingAddress: optionalText(formData.billingAddress),
      deliveryAddress: optionalText(formData.deliveryAddress),
      lifecycleStatus: formData.lifecycleStatus,
      items: formData.items.map((item) => ({
        id: item.id,
        lineNumber: Number(item.lineNumber),
        description: item.description.trim(),
        brand: item.brand.trim(),
        specification: optionalText(item.specification),
        originalUnit: item.originalUnit.trim(),
        normalizedUnit: item.normalizedUnit.trim(),
        orderedQuantity: Number(item.orderedQuantity),
        saleUnitPrice: Number(item.saleUnitPrice),
        officialTotal: Number(item.officialTotal),
        notes: optionalText(item.notes),
      })),
    };

    try {
      const savedOrder =
        isEditing && purchaseOrderId
          ? await updateMutation.mutateAsync({
              ...payload,
              entityId: selectedEntityId,
              purchaseOrderId,
            })
          : await createMutation.mutateAsync({
              ...payload,
              entityId: selectedEntityId,
            });

      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.PURCHASE_ORDERS, selectedEntityId],
      });
      toast.success(isEditing ? "Ordem atualizada." : "Ordem criada.");
      navigate(`/orders/${savedOrder.id}`);
    } catch (error) {
      treatAxiosError(error);
    }
  });

  if (isEditing && isFetchingOrder) {
    return (
      <div className="p-4 lg:p-6">
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            Carregando ordem...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isFetchingCustomers && !customers?.length) {
    return (
      <div className="p-4 lg:p-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <p className="font-semibold">Cadastre um cliente primeiro</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Toda ordem precisa pertencer a uma unidade compradora.
            </p>
            <Button asChild>
              <Link to="/customers">Ir para clientes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-6 px-4 py-5 lg:px-6 lg:py-7"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="ghost" className="w-fit" asChild>
          <Link to={isEditing && purchaseOrderId ? `/orders/${purchaseOrderId}` : "/orders"}>
            <IconArrowLeft />
            Voltar
          </Link>
        </Button>
        <Button
          type="submit"
          isLoading={createMutation.isPending || updateMutation.isPending}
        >
          <IconDeviceFloppy />
          {isEditing ? "Salvar alteracoes" : "Criar ordem"}
        </Button>
      </div>

      <section className="rounded-2xl border bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_40%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent)] p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
          {isEditing ? "Edicao da ordem" : "Novo compromisso"}
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
          {isEditing ? `Ordem ${order?.orderNumber ?? ""}` : "Nova ordem de compra"}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Transcreva apenas os dados operacionais do documento. O total oficial
          sera preservado mesmo quando diferir da soma das linhas.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Identificacao</CardTitle>
          <CardDescription>Cliente, numeros e datas da ordem.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label>Cliente</Label>
            <Controller
              control={control}
              name="customerId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={handleCustomerChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCustomers?.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.tradeName || customer.legalName}
                      </SelectItem>
                    ))}
                    {order?.customer &&
                      !activeCustomers?.some(
                        (customer) => customer.id === order.customer.id
                      ) && (
                        <SelectItem
                          value={order.customer.id}
                          disabled={!order.customer.active}
                        >
                          {order.customer.tradeName ||
                            order.customer.legalName}
                        </SelectItem>
                      )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.customerId?.message && (
              <p className="text-xs text-destructive">
                {errors.customerId.message}
              </p>
            )}
          </div>

          <Field label="Numero da ordem" error={errors.orderNumber?.message}>
            <Input placeholder="OC-2026-001" {...register("orderNumber")} />
          </Field>
          <Field label="Numero externo">
            <Input placeholder="Opcional" {...register("externalNumber")} />
          </Field>
          <Field label="Cotacao">
            <Input placeholder="Opcional" {...register("quoteNumber")} />
          </Field>
          <Field label="Requisicao">
            <Input placeholder="Opcional" {...register("requisitionNumber")} />
          </Field>
          <Field label="Situacao">
            <Controller
              control={control}
              name="lifecycleStatus"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Ativa</SelectItem>
                    <SelectItem value="DRAFT">Rascunho</SelectItem>
                    <SelectItem value="CANCELLED">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Data de emissao" error={errors.issuedAt?.message}>
            <Input type="date" {...register("issuedAt")} />
          </Field>
          <Field label="Entrega solicitada">
            <Input type="date" {...register("requestedDeliveryAt")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Itens da ordem</CardTitle>
              <CardDescription className="mt-1">
                Uma linha para cada item solicitado pelo cliente.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const nextLine =
                  Math.max(0, ...watchedItems.map((item) => item.lineNumber)) +
                  1;
                append(newItem(nextLine));
              }}
            >
              <IconPlus />
              Adicionar item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-2xl border bg-muted/10 p-4 sm:p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-sm font-semibold text-emerald-400">
                    {index + 1}
                  </span>
                  <p className="font-medium">Item da ordem</p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={fields.length === 1}
                  onClick={() => remove(index)}
                  aria-label={`Remover item ${index + 1}`}
                >
                  <IconTrash className="text-destructive" />
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                <Field
                  label="Linha"
                  error={errors.items?.[index]?.lineNumber?.message}
                >
                  <Input
                    type="number"
                    min="1"
                    {...register(`items.${index}.lineNumber`, {
                      valueAsNumber: true,
                    })}
                  />
                </Field>
                <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                  <Label>Descricao</Label>
                  <Input
                    placeholder="Descricao conforme a ordem"
                    error={errors.items?.[index]?.description?.message}
                    {...register(`items.${index}.description`)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-1 lg:col-span-2">
                  <Label>Marca</Label>
                  <Input
                    placeholder="Marca informada"
                    error={errors.items?.[index]?.brand?.message}
                    {...register(`items.${index}.brand`)}
                  />
                </div>

                <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                  <Label>Especificacao opcional</Label>
                  <Input
                    placeholder="Modelo, tamanho ou detalhe relevante"
                    {...register(`items.${index}.specification`)}
                  />
                </div>
                <Field label="Unidade original">
                  <Input
                    placeholder="UN"
                    error={errors.items?.[index]?.originalUnit?.message}
                    {...register(`items.${index}.originalUnit`)}
                  />
                </Field>
                <Field label="Unidade normalizada">
                  <Input
                    placeholder="UNIT"
                    error={errors.items?.[index]?.normalizedUnit?.message}
                    {...register(`items.${index}.normalizedUnit`)}
                  />
                </Field>
                <Field
                  label="Quantidade"
                  error={errors.items?.[index]?.orderedQuantity?.message}
                >
                  <Input
                    type="number"
                    min="0.001"
                    step="0.001"
                    {...register(`items.${index}.orderedQuantity`, {
                      valueAsNumber: true,
                    })}
                  />
                </Field>
                <Field
                  label="Preco unitario"
                  error={errors.items?.[index]?.saleUnitPrice?.message}
                >
                  <Input
                    type="number"
                    min="0"
                    step="0.000001"
                    {...register(`items.${index}.saleUnitPrice`, {
                      valueAsNumber: true,
                    })}
                  />
                </Field>
                <Field
                  label="Total oficial da linha"
                  error={errors.items?.[index]?.officialTotal?.message}
                >
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    {...register(`items.${index}.officialTotal`, {
                      valueAsNumber: true,
                    })}
                  />
                </Field>
                <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                  <Label>Observacoes</Label>
                  <Input
                    placeholder="Opcional"
                    {...register(`items.${index}.notes`)}
                  />
                </div>
              </div>
            </div>
          ))}

          {errors.items?.root?.message && (
            <p className="text-sm text-destructive">
              {errors.items.root.message}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Condicoes e destinos</CardTitle>
            <CardDescription>
              Estes dados ficam congelados na ordem, mesmo se o cliente mudar.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Condicao de pagamento</Label>
              <Textarea
                placeholder="Ex: 30 dias apos faturamento"
                {...register("paymentTerms")}
              />
            </div>
            <Field label="Endereco de faturamento">
              <Textarea
                placeholder="Copiado do cliente ao selecionar"
                {...register("billingAddress")}
              />
            </Field>
            <Field label="Endereco de entrega">
              <Textarea
                placeholder="Copiado do cliente ao selecionar"
                {...register("deliveryAddress")}
              />
            </Field>
            <Field label="Instrucoes">
              <Textarea
                placeholder="Instrucoes presentes no documento"
                {...register("instructions")}
              />
            </Field>
            <Field label="Observacoes internas">
              <Textarea
                placeholder="Contexto util para a operacao"
                {...register("notes")}
              />
            </Field>
          </CardContent>
        </Card>

        <Card className="h-fit border-emerald-500/20 bg-emerald-500/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconCalculator className="size-5 text-emerald-400" />
              Conferencia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Soma dos itens</p>
              <p className="mt-1 text-2xl font-semibold">
                {formatCurrency(calculatedItemsTotal)}
              </p>
            </div>
            <Field
              label="Total oficial da ordem"
              error={errors.officialTotal?.message}
            >
              <Input
                type="number"
                min="0"
                step="0.01"
                {...register("officialTotal", { valueAsNumber: true })}
              />
            </Field>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() =>
                setValue("officialTotal", calculatedItemsTotal, {
                  shouldValidate: true,
                })
              }
            >
              Usar soma dos itens
            </Button>
            {hasTotalMismatch && (
              <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-5 text-amber-200">
                Ha divergencia. O sistema preservara o total oficial e mostrara
                o alerta no detalhe da ordem.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col-reverse gap-2 rounded-2xl border bg-background/90 p-3 shadow-2xl backdrop-blur sm:sticky sm:bottom-4 sm:z-10 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" asChild>
          <Link to="/orders">Cancelar</Link>
        </Button>
        <Button
          type="submit"
          isLoading={createMutation.isPending || updateMutation.isPending}
        >
          <IconDeviceFloppy />
          {isEditing ? "Salvar alteracoes" : "Criar ordem"}
        </Button>
      </div>
    </form>
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
