import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  IconArrowLeft,
  IconCalculator,
  IconDeviceFloppy,
  IconPackageImport,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { QueryKeys } from "@/app/config/QueryKeys";
import type { Product } from "@/app/entities/Product";
import type { PurchaseOrderInput } from "@/app/entities/PurchaseOrder";
import { useAuth } from "@/app/hooks/useAuth";
import { useCustomers } from "@/app/hooks/useCustomers";
import { usePurchaseOrder } from "@/app/hooks/usePurchaseOrder";
import { useProducts } from "@/app/hooks/useProducts";
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
import { InputCurrency } from "@/view/components/InputCurrency";
import { ProductCombobox } from "@/view/components/ProductCombobox";
import { ProductModal } from "@/view/modals/ProductModal";
import { formatCurrency } from "./purchaseOrderPresentation";

const itemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1, "Selecione um produto."),
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

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateLineTotal(
  item: Pick<
    OrderFormData["items"][number],
    "orderedQuantity" | "saleUnitPrice"
  >
) {
  return roundMoney(
    (Number(item.orderedQuantity) || 0) * (Number(item.saleUnitPrice) || 0)
  );
}

function resolveLineTotal(item: OrderFormData["items"][number]) {
  const officialTotal = Number(item.officialTotal) || 0;
  const calculatedTotal = calculateLineTotal(item);

  return officialTotal === 0 && calculatedTotal > 0
    ? calculatedTotal
    : officialTotal;
}

function calculateItemsTotal(items: OrderFormData["items"]) {
  const totalInCents = items.reduce(
    (total, item) =>
      total + Math.round((Number(item.officialTotal) || 0) * 100),
    0
  );

  return totalInCents / 100;
}

const newItem = (lineNumber: number): OrderFormData["items"][number] => ({
  productId: "",
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
  const previousCalculatedItemsTotal = useRef(0);
  const [quickProductItemIndex, setQuickProductItemIndex] = useState<
    number | null
  >(null);
  const [quickCreatedProducts, setQuickCreatedProducts] = useState<Product[]>(
    []
  );

  const { customers, isFetchingCustomers } = useCustomers(
    {
      entityId: selectedEntityId ?? "",
    },
    Boolean(selectedEntityId)
  );
  const activeCustomers = customers?.filter((customer) => customer.active);

  const { products, isFetchingProducts } = useProducts(
    { entityId: selectedEntityId ?? "" },
    Boolean(selectedEntityId)
  );
  const availableProducts = [
    ...quickCreatedProducts,
    ...(products?.filter(
      (product) =>
        !quickCreatedProducts.some((created) => created.id === product.id)
    ) ?? []),
  ];

  const { order, isFetchingOrder } = usePurchaseOrder(
    {
      entityId: selectedEntityId ?? "",
      purchaseOrderId: purchaseOrderId ?? "",
    },
    Boolean(selectedEntityId && purchaseOrderId)
  );

  const {
    clearErrors,
    control,
    getValues,
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

    const normalizedItems = order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      lineNumber: item.lineNumber,
      description: item.description,
      brand: item.brand,
      specification: item.specification ?? "",
      originalUnit: item.originalUnit,
      normalizedUnit: item.normalizedUnit,
      orderedQuantity: item.orderedQuantity,
      saleUnitPrice: item.saleUnitPrice,
      officialTotal: resolveLineTotal({
        ...item,
        specification: item.specification ?? "",
        notes: item.notes ?? "",
      }),
      notes: item.notes ?? "",
    }));
    const normalizedItemsTotal = calculateItemsTotal(normalizedItems);

    previousCalculatedItemsTotal.current = normalizedItemsTotal;
    reset({
      customerId: order.customerId || order.customer.id,
      orderNumber: order.orderNumber,
      externalNumber: order.externalNumber ?? "",
      quoteNumber: order.quoteNumber ?? "",
      requisitionNumber: order.requisitionNumber ?? "",
      issuedAt: toDateInput(order.issuedAt),
      requestedDeliveryAt: toDateInput(order.requestedDeliveryAt),
      officialTotal:
        order.officialTotal === 0 && normalizedItemsTotal > 0
          ? normalizedItemsTotal
          : order.officialTotal,
      paymentTerms: order.paymentTerms ?? "",
      instructions: order.instructions ?? "",
      notes: order.notes ?? "",
      billingAddress: order.billingAddress ?? "",
      deliveryAddress: order.deliveryAddress ?? "",
      lifecycleStatus: order.lifecycleStatus,
      items: normalizedItems,
    });
    initializedOrderId.current = order.id;
  }, [order, reset]);

  useEffect(() => {
    if (!order) {
      return;
    }

    const customerId = order.customerId || order.customer.id;
    if (getValues("customerId") !== customerId) {
      setValue("customerId", customerId, { shouldValidate: true });
    }
    clearErrors("customerId");
  }, [clearErrors, getValues, order, setValue]);

  const watchedItems = watch("items");
  const calculatedItemsTotal = calculateItemsTotal(watchedItems);
  const officialTotal = watch("officialTotal");
  const hasTotalMismatch =
    Math.round(calculatedItemsTotal * 100) !==
    Math.round((Number(officialTotal) || 0) * 100);
  const areItemsLocked =
    isEditing && Boolean(order?.acquisitionCount);

  useEffect(() => {
    const previousTotal = previousCalculatedItemsTotal.current;
    const currentOfficialTotal = Number(getValues("officialTotal")) || 0;
    const orderTotalWasAutomatic =
      Math.round(currentOfficialTotal * 100) ===
        Math.round(previousTotal * 100) || currentOfficialTotal === 0;

    if (
      orderTotalWasAutomatic &&
      Math.round(currentOfficialTotal * 100) !==
        Math.round(calculatedItemsTotal * 100)
    ) {
      setValue("officialTotal", calculatedItemsTotal, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    previousCalculatedItemsTotal.current = calculatedItemsTotal;
  }, [calculatedItemsTotal, getValues, setValue]);

  const updateCalculatedItemTotal = (
    index: number,
    values: Partial<
      Pick<
        OrderFormData["items"][number],
        "orderedQuantity" | "saleUnitPrice"
      >
    >
  ) => {
    const item = getValues(`items.${index}`);

    setValue(
      `items.${index}.officialTotal`,
      calculateLineTotal({ ...item, ...values }),
      { shouldDirty: true, shouldValidate: true }
    );
  };

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

  const handleProductChange = (
    index: number,
    productId: string,
    createdProduct?: Product
  ) => {
    const product =
      createdProduct ??
      availableProducts.find((item) => item.id === productId);

    setValue(`items.${index}.productId`, productId, {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (!product) {
      return;
    }

    setValue(`items.${index}.description`, product.name, {
      shouldDirty: true,
    });
    setValue(`items.${index}.brand`, product.brand, { shouldDirty: true });
    setValue(`items.${index}.specification`, product.specification ?? "", {
      shouldDirty: true,
    });
    setValue(`items.${index}.originalUnit`, product.packaging, {
      shouldDirty: true,
    });
    setValue(`items.${index}.normalizedUnit`, product.normalizedUnit, {
      shouldDirty: true,
    });

    if (product.lastSalePrice !== undefined) {
      setValue(`items.${index}.saleUnitPrice`, product.lastSalePrice, {
        shouldDirty: true,
        shouldValidate: true,
      });
      updateCalculatedItemTotal(index, {
        saleUnitPrice: product.lastSalePrice,
      });
    }
  };

  const handleQuickProductCreated = (product: Product) => {
    const itemIndex = quickProductItemIndex;

    setQuickCreatedProducts((current) => [
      product,
      ...current.filter((item) => item.id !== product.id),
    ]);

    requestAnimationFrame(() => {
      if (itemIndex !== null) {
        handleProductChange(itemIndex, product.id, product);
      }
    });
  };

  const onSubmit = handleSubmit(async (formData) => {
    if (!selectedEntityId) {
      return;
    }

    const normalizedItems = formData.items.map((item) => ({
      ...item,
      officialTotal: resolveLineTotal(item),
    }));
    const normalizedItemsTotal = calculateItemsTotal(normalizedItems);

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
      officialTotal:
        Number(formData.officialTotal) === 0 && normalizedItemsTotal > 0
          ? normalizedItemsTotal
          : Number(formData.officialTotal),
      paymentTerms: optionalText(formData.paymentTerms),
      instructions: optionalText(formData.instructions),
      notes: optionalText(formData.notes),
      billingAddress: optionalText(formData.billingAddress),
      deliveryAddress: optionalText(formData.deliveryAddress),
      lifecycleStatus: formData.lifecycleStatus,
      items: normalizedItems.map((item) => ({
        id: item.id,
        productId: item.productId,
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
              items: areItemsLocked ? undefined : payload.items,
              entityId: selectedEntityId,
              purchaseOrderId,
            })
          : await createMutation.mutateAsync({
              ...payload,
              entityId: selectedEntityId,
            });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.PURCHASE_ORDERS, selectedEntityId],
        }),
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.PRODUCTS, selectedEntityId],
        }),
      ]);
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
    <>
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
              render={({ field }) => {
                const customerId =
                  field.value || order?.customerId || order?.customer.id || "";
                return (
                  <Select
                    value={customerId}
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
                );
              }}
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
          <CardTitle>Itens da ordem</CardTitle>
          <CardDescription>
            Selecione produtos do catalogo e informe quantidade e preco desta
            venda. Os dados do produto ficam preservados na ordem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {areItemsLocked && (
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-6 text-amber-100">
              Os itens foram bloqueados porque a ordem ja possui aquisicoes.
              Cabecalho, datas, enderecos e observacoes ainda podem ser
              atualizados.
            </div>
          )}
          <fieldset
            disabled={areItemsLocked}
            className="space-y-4 disabled:opacity-70"
          >
            {fields.map((field, index) => {
              const item = watchedItems[index];
              const selectedProduct = availableProducts.find(
                (product) => product.id === item?.productId
              );
              const productOptions = availableProducts.filter(
                (product) => product.active || product.id === item?.productId
              );

              return (
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
                <div className="space-y-2 sm:col-span-1 lg:col-span-4">
                  <Label>Produto</Label>
                  <Controller
                    control={control}
                    name={`items.${index}.productId`}
                    render={({ field: productField }) => (
                      <ProductCombobox
                        products={productOptions}
                        value={productField.value}
                        onValueChange={(productId) =>
                          handleProductChange(index, productId)
                        }
                        placeholder={
                          isFetchingProducts
                            ? "Carregando produtos..."
                            : "Selecione o produto"
                        }
                        disabled={isFetchingProducts}
                      />
                    )}
                  />
                  {errors.items?.[index]?.productId?.message && (
                    <p className="text-xs text-destructive">
                      {errors.items[index]?.productId?.message}
                    </p>
                  )}
                </div>
                <div className="flex items-end lg:col-span-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setQuickProductItemIndex(index)}
                  >
                    <IconPackageImport />
                    Nao encontrou?
                  </Button>
                </div>

                <input
                  type="hidden"
                  {...register(`items.${index}.description`)}
                />
                <input type="hidden" {...register(`items.${index}.brand`)} />
                <input
                  type="hidden"
                  {...register(`items.${index}.specification`)}
                />
                <input
                  type="hidden"
                  {...register(`items.${index}.originalUnit`)}
                />
                <input
                  type="hidden"
                  {...register(`items.${index}.normalizedUnit`)}
                />

                <div className="rounded-xl border bg-background/60 p-3 sm:col-span-2 lg:col-span-6">
                  {item?.productId ? (
                    <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Produto</p>
                        <p className="mt-1 font-medium">{item.description}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Marca</p>
                        <p className="mt-1 font-medium">{item.brand}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Embalagem</p>
                        <p className="mt-1 font-medium">{item.originalUnit}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Referencia da ultima compra
                        </p>
                        <p className="mt-1 font-medium">
                          {selectedProduct?.lastPurchasePrice !== undefined
                            ? formatCurrency(selectedProduct.lastPurchasePrice)
                            : "Sem referencia"}
                        </p>
                      </div>
                      {item.specification && (
                        <p className="text-muted-foreground sm:col-span-2 lg:col-span-4">
                          {item.specification}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Selecione um produto ou cadastre um novo sem sair desta
                      ordem.
                    </p>
                  )}
                </div>
                <Field
                  label="Quantidade"
                  error={errors.items?.[index]?.orderedQuantity?.message}
                >
                  <Controller
                    control={control}
                    name={`items.${index}.orderedQuantity`}
                    render={({ field: quantityField }) => (
                      <Input
                        {...quantityField}
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={
                          Number.isFinite(quantityField.value)
                            ? quantityField.value
                            : ""
                        }
                        onChange={(event) => {
                          const orderedQuantity = event.target.valueAsNumber;
                          quantityField.onChange(orderedQuantity);
                          updateCalculatedItemTotal(index, {
                            orderedQuantity,
                          });
                        }}
                      />
                    )}
                  />
                </Field>
                <Field
                  label="Preco unitario"
                  error={errors.items?.[index]?.saleUnitPrice?.message}
                >
                  <Controller
                    control={control}
                    name={`items.${index}.saleUnitPrice`}
                    render={({ field: priceField }) => (
                      <InputCurrency
                        variant="field"
                        value={
                          Number.isFinite(priceField.value)
                            ? priceField.value
                            : 0
                        }
                        onChange={(saleUnitPrice) => {
                          priceField.onChange(saleUnitPrice);
                          updateCalculatedItemTotal(index, { saleUnitPrice });
                        }}
                      />
                    )}
                  />
                </Field>
                <Field
                  label="Total oficial da linha"
                  error={errors.items?.[index]?.officialTotal?.message}
                >
                  <Controller
                    control={control}
                    name={`items.${index}.officialTotal`}
                    render={({ field }) => (
                      <InputCurrency
                        variant="field"
                        value={Number.isFinite(field.value) ? field.value : 0}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <p className="text-xs leading-5 text-muted-foreground">
                    Calculado por quantidade x preco. Ajuste apenas se o
                    documento informar outro total.
                  </p>
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
              );
            })}

            <Button
              type="button"
              variant="outline"
              className="h-12 w-full border-dashed"
              disabled={areItemsLocked}
              onClick={() => {
                const nextLine =
                  Math.max(0, ...watchedItems.map((item) => item.lineNumber)) +
                  1;
                append(newItem(nextLine));
              }}
            >
              <IconPlus />
              Adicionar outro item
            </Button>

            {errors.items?.root?.message && (
              <p className="text-sm text-destructive">
                {errors.items.root.message}
              </p>
            )}
          </fieldset>
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
              <Controller
                control={control}
                name="officialTotal"
                render={({ field }) => (
                  <InputCurrency
                    variant="field"
                    value={Number.isFinite(field.value) ? field.value : 0}
                    onChange={field.onChange}
                  />
                )}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Acompanha a soma das linhas ate que voce informe um valor
                diferente do documento.
              </p>
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

      <ProductModal
        isOpen={quickProductItemIndex !== null}
        onClose={() => setQuickProductItemIndex(null)}
        onCreated={handleQuickProductCreated}
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
