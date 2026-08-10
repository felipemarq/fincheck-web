import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconFileInvoice,
  IconInfoCircle,
  IconPhotoPlus,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { QueryKeys } from "@/app/config/QueryKeys";
import type { Product } from "@/app/entities/Product";
import type {
  Quotation,
  QuotationInput,
  QuotationItemImage,
} from "@/app/entities/Quotation";
import { useAuth } from "@/app/hooks/useAuth";
import { useCustomers } from "@/app/hooks/useCustomers";
import { useProducts } from "@/app/hooks/useProducts";
import { useQuotation } from "@/app/hooks/useQuotation";
import { quotationService } from "@/app/services/quotationService";
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
import { formatQuotationCurrency } from "./quotationPresentation";

const MAX_IMAGES_PER_ITEM = 3;
const MAX_IMAGE_SIZE = 3 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const quotationItemSchema = z.object({
  id: z.string().uuid().optional(),
  productId: z.string().min(1, "Selecione um produto."),
  lineNumber: z.number().int().positive("Use uma linha maior que zero."),
  quantity: z.number().positive("A quantidade deve ser maior que zero."),
  unitPrice: z.number().nonnegative("O valor nao pode ser negativo."),
  notes: z.string().trim().max(4000),
});

const quotationSchema = z
  .object({
    customerId: z.string().min(1, "Selecione o cliente."),
    number: z.string().trim().min(1, "Informe o numero.").max(80),
    status: z.enum([
      "DRAFT",
      "SENT",
      "APPROVED",
      "REJECTED",
      "CANCELLED",
      "EXPIRED",
    ]),
    issuedAt: z.string().min(1, "Informe a data de emissao."),
    validUntil: z.string(),
    sellerName: z.string().trim().min(1, "Informe a empresa.").max(160),
    sellerDocument: z.string().trim().max(40),
    sellerEmail: z
      .string()
      .trim()
      .email("Informe um e-mail valido.")
      .max(254)
      .or(z.literal("")),
    sellerPhone: z.string().trim().max(40),
    sellerAddress: z.string().trim().max(2000),
    customerAddress: z.string().trim().max(2000),
    paymentTerms: z.string().trim().max(4000),
    deliveryTerms: z.string().trim().max(4000),
    notes: z.string().trim().max(8000),
    internalNotes: z.string().trim().max(8000),
    freight: z.number().nonnegative("O frete nao pode ser negativo."),
    discount: z.number().nonnegative("O desconto nao pode ser negativo."),
    items: z.array(quotationItemSchema).min(1, "Adicione ao menos um item."),
  })
  .superRefine((data, context) => {
    if (data.validUntil && data.validUntil < data.issuedAt) {
      context.addIssue({
        code: "custom",
        path: ["validUntil"],
        message: "A validade nao pode ser anterior a emissao.",
      });
    }

    const subtotal = data.items.reduce(
      (total, item) => total + calculateLineTotal(item.quantity, item.unitPrice),
      0
    );

    if (data.discount > subtotal + data.freight) {
      context.addIssue({
        code: "custom",
        path: ["discount"],
        message: "O desconto nao pode ser maior que subtotal e frete.",
      });
    }

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

type QuotationFormData = z.infer<typeof quotationSchema>;

type LocalImage = {
  id: string;
  file: File;
  previewUrl: string;
};

function roundMoney(value: number) {
  const scaledValue = value * 100;
  return (
    Math.round(
      scaledValue + Number.EPSILON * Math.max(1, Math.abs(scaledValue))
    ) / 100
  );
}

function calculateLineTotal(quantity: number, unitPrice: number) {
  return roundMoney((Number(quantity) || 0) * (Number(unitPrice) || 0));
}

function getLocalDateInputValue(offsetInDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetInDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function buildSuggestedNumber() {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const time = `${String(now.getHours()).padStart(2, "0")}${String(
    now.getMinutes()
  ).padStart(2, "0")}`;

  return `COT-${date}-${time}`;
}

const newItem = (lineNumber: number): QuotationFormData["items"][number] => ({
  productId: "",
  lineNumber,
  quantity: 1,
  unitPrice: 0,
  notes: "",
});

function buildInitialValues(sellerName?: string): QuotationFormData {
  return {
    customerId: "",
    number: buildSuggestedNumber(),
    status: "DRAFT",
    issuedAt: getLocalDateInputValue(),
    validUntil: getLocalDateInputValue(15),
    sellerName: sellerName ?? "",
    sellerDocument: "",
    sellerEmail: "",
    sellerPhone: "",
    sellerAddress: "",
    customerAddress: "",
    paymentTerms: "",
    deliveryTerms: "",
    notes: "",
    internalNotes: "",
    freight: 0,
    discount: 0,
    items: [newItem(1)],
  };
}

function toDateInputValue(value?: string) {
  return value ? value.slice(0, 10) : "";
}

function buildEditValues(quotation: Quotation): QuotationFormData {
  return {
    customerId: quotation.customerId,
    number: quotation.number,
    status: quotation.status,
    issuedAt: toDateInputValue(quotation.issuedAt),
    validUntil: toDateInputValue(quotation.validUntil),
    sellerName: quotation.sellerName,
    sellerDocument: quotation.sellerDocument ?? "",
    sellerEmail: quotation.sellerEmail ?? "",
    sellerPhone: quotation.sellerPhone ?? "",
    sellerAddress: quotation.sellerAddress ?? "",
    customerAddress: quotation.customerAddress ?? "",
    paymentTerms: quotation.paymentTerms ?? "",
    deliveryTerms: quotation.deliveryTerms ?? "",
    notes: quotation.notes ?? "",
    internalNotes: quotation.internalNotes ?? "",
    freight: quotation.freight,
    discount: quotation.discount,
    items: quotation.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      lineNumber: item.lineNumber,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      notes: item.notes ?? "",
    })),
  };
}

function toIsoDate(value: string) {
  return new Date(`${value}T12:00:00.000Z`).toISOString();
}

function optionalText(value: string) {
  return value.trim() || undefined;
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.includes(",") ? result.slice(result.indexOf(",") + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function QuotationForm() {
  const navigate = useNavigate();
  const { quotationId = "" } = useParams();
  const isEditing = Boolean(quotationId);
  const queryClient = useQueryClient();
  const { activeEntity, selectedEntityId } = useAuth();
  const [quickProductItemIndex, setQuickProductItemIndex] = useState<
    number | null
  >(null);
  const [quickCreatedProducts, setQuickCreatedProducts] = useState<Product[]>(
    []
  );
  const [imagesByFieldId, setImagesByFieldId] = useState<
    Record<string, LocalImage[]>
  >({});
  const [existingImagesByItemId, setExistingImagesByItemId] = useState<
    Record<string, QuotationItemImage[]>
  >({});
  const [removedImageIds, setRemovedImageIds] = useState<Set<string>>(
    () => new Set()
  );
  const imagesRef = useRef(imagesByFieldId);
  const initializedQuotationId = useRef<string | null>(null);

  const { customers, isFetchingCustomers } = useCustomers(
    { entityId: selectedEntityId ?? "", active: true },
    Boolean(selectedEntityId)
  );
  const { products, isFetchingProducts } = useProducts(
    { entityId: selectedEntityId ?? "", active: true },
    Boolean(selectedEntityId)
  );
  const {
    quotation,
    isFetchingQuotation,
    isError: isQuotationError,
    refetch: refetchQuotation,
  } = useQuotation(
    { entityId: selectedEntityId ?? "", quotationId },
    Boolean(selectedEntityId && quotationId)
  );
  const availableProducts = [
    ...quickCreatedProducts,
    ...(products?.filter(
      (product) =>
        !quickCreatedProducts.some((created) => created.id === product.id)
    ) ?? []),
  ];

  const {
    control,
    getValues,
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<QuotationFormData>({
    resolver: zodResolver(quotationSchema),
    defaultValues: buildInitialValues(activeEntity?.name),
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
    keyName: "fieldKey",
  });
  const createMutation = useMutation({ mutationFn: quotationService.create });
  const updateMutation = useMutation({ mutationFn: quotationService.update });
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    imagesRef.current = imagesByFieldId;
  }, [imagesByFieldId]);

  useEffect(
    () => () => {
      Object.values(imagesRef.current)
        .flat()
        .forEach((image) => URL.revokeObjectURL(image.previewUrl));
    },
    []
  );

  useEffect(() => {
    if (!quotation || initializedQuotationId.current === quotation.id) return;

    Object.values(imagesRef.current)
      .flat()
      .forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setImagesByFieldId({});
    setExistingImagesByItemId(
      Object.fromEntries(
        quotation.items.map((item) => [item.id, item.images])
      )
    );
    setRemovedImageIds(new Set());
    reset(buildEditValues(quotation));
    initializedQuotationId.current = quotation.id;
  }, [quotation, reset]);

  useEffect(() => {
    if (!isEditing && activeEntity && !getValues("sellerName")) {
      setValue("sellerName", activeEntity.name);
    }
  }, [activeEntity, getValues, isEditing, setValue]);

  const watchedItems = watch("items");
  const freight = Number(watch("freight")) || 0;
  const discount = Number(watch("discount")) || 0;
  const subtotal = roundMoney(
    watchedItems.reduce(
      (total, item) =>
        total + calculateLineTotal(item.quantity, item.unitPrice),
      0
    )
  );
  const total = roundMoney(subtotal + freight - discount);
  const totalImages =
    Object.values(imagesByFieldId).reduce(
      (count, images) => count + images.length,
      0
    ) +
    watchedItems.reduce(
      (count, item) =>
        count +
        (item.id
          ? (existingImagesByItemId[item.id] ?? []).filter(
              (image) => !removedImageIds.has(image.id)
            ).length
          : 0),
      0
    );

  const handleCustomerChange = (customerId: string) => {
    setValue("customerId", customerId, {
      shouldDirty: true,
      shouldValidate: true,
    });
    const customer = customers?.find((item) => item.id === customerId);
    if (customer) {
      setValue(
        "customerAddress",
        customer.billingAddress ?? customer.deliveryAddress ?? "",
        { shouldDirty: true }
      );
    }
  };

  const handleProductChange = (
    index: number,
    productId: string,
    createdProduct?: Product
  ) => {
    const product =
      createdProduct ??
      availableProducts.find((candidate) => candidate.id === productId);
    setValue(`items.${index}.productId`, productId, {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (product?.lastSalePrice !== undefined) {
      setValue(`items.${index}.unitPrice`, product.lastSalePrice, {
        shouldDirty: true,
        shouldValidate: true,
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

  const handleImagesSelected = (
    fieldId: string,
    fileList: FileList | null,
    existingImageCount: number
  ) => {
    if (!fileList?.length) return;

    const currentImages = imagesByFieldId[fieldId] ?? [];
    const availableSlots =
      MAX_IMAGES_PER_ITEM - currentImages.length - existingImageCount;
    if (availableSlots <= 0) {
      toast.error(`Cada produto aceita ate ${MAX_IMAGES_PER_ITEM} imagens.`);
      return;
    }

    const accepted: LocalImage[] = [];
    for (const file of Array.from(fileList)) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
        toast.error(`${file.name}: use JPG, PNG ou WEBP.`);
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        toast.error(`${file.name}: o limite e 3 MB por imagem.`);
        continue;
      }
      if (accepted.length >= availableSlots) break;

      accepted.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (accepted.length < fileList.length && accepted.length === availableSlots) {
      toast.info(`Foram mantidas apenas ${MAX_IMAGES_PER_ITEM} imagens neste produto.`);
    }

    setImagesByFieldId((current) => ({
      ...current,
      [fieldId]: [...(current[fieldId] ?? []), ...accepted],
    }));
  };

  const removeImage = (fieldId: string, imageId: string) => {
    setImagesByFieldId((current) => {
      const image = current[fieldId]?.find((candidate) => candidate.id === imageId);
      if (image) URL.revokeObjectURL(image.previewUrl);

      return {
        ...current,
        [fieldId]: (current[fieldId] ?? []).filter(
          (candidate) => candidate.id !== imageId
        ),
      };
    });
  };

  const removeExistingImage = (imageId: string) => {
    setRemovedImageIds((current) => new Set(current).add(imageId));
  };

  const removeItem = (index: number) => {
    const fieldId = fields[index]?.fieldKey;
    if (fieldId) {
      (imagesByFieldId[fieldId] ?? []).forEach((image) =>
        URL.revokeObjectURL(image.previewUrl)
      );
      setImagesByFieldId((current) => {
        const next = { ...current };
        delete next[fieldId];
        return next;
      });
    }
    remove(index);
  };

  const onSubmit = handleSubmit(async (formData) => {
    if (!selectedEntityId) return;

    const imagesByLineNumber = new Map(
      formData.items.map((item, index) => [
        item.lineNumber,
        imagesByFieldId[fields[index]?.fieldKey] ?? [],
      ])
    );
    const payload: QuotationInput = {
      customerId: formData.customerId,
      number: formData.number.trim(),
      status: formData.status,
      issuedAt: toIsoDate(formData.issuedAt),
      validUntil: formData.validUntil
        ? toIsoDate(formData.validUntil)
        : undefined,
      sellerName: formData.sellerName.trim(),
      sellerDocument: optionalText(formData.sellerDocument),
      sellerEmail: optionalText(formData.sellerEmail),
      sellerPhone: optionalText(formData.sellerPhone),
      sellerAddress: optionalText(formData.sellerAddress),
      customerAddress: optionalText(formData.customerAddress),
      paymentTerms: optionalText(formData.paymentTerms),
      deliveryTerms: optionalText(formData.deliveryTerms),
      notes: optionalText(formData.notes),
      internalNotes: optionalText(formData.internalNotes),
      freight: Number(formData.freight),
      discount: Number(formData.discount),
      items: formData.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        lineNumber: Number(item.lineNumber),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        notes: optionalText(item.notes),
      })),
    };

    try {
      const savedQuotation = isEditing
        ? await updateMutation.mutateAsync({
            ...payload,
            entityId: selectedEntityId,
            quotationId,
          })
        : await createMutation.mutateAsync({
            ...payload,
            entityId: selectedEntityId,
          });
      let failedImageChanges = 0;

      if (isEditing && removedImageIds.size > 0) {
        const retainedImageIds = new Set(
          savedQuotation.items.flatMap((item) =>
            item.images.map((image) => image.id)
          )
        );

        for (const imageId of removedImageIds) {
          if (!retainedImageIds.has(imageId)) continue;

          try {
            await quotationService.deleteImage({
              entityId: selectedEntityId,
              quotationId: savedQuotation.id,
              imageId,
            });
          } catch {
            failedImageChanges += 1;
          }
        }
      }

      for (const item of savedQuotation.items) {
        for (const image of imagesByLineNumber.get(item.lineNumber) ?? []) {
          try {
            await quotationService.uploadImage({
              entityId: selectedEntityId,
              quotationId: savedQuotation.id,
              quotationItemId: item.id,
              fileName: image.file.name,
              contentType: image.file.type as (typeof ACCEPTED_IMAGE_TYPES)[number],
              dataBase64: await fileToBase64(image.file),
            });
          } catch {
            failedImageChanges += 1;
          }
        }
      }

      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.QUOTATIONS, selectedEntityId],
      });
      if (failedImageChanges > 0) {
        toast.warning(
          `Cotacao salva, mas ${failedImageChanges} alteracao(oes) de imagem falharam.`
        );
      } else {
        toast.success(
          isEditing
            ? "Cotacao atualizada."
            : totalImages > 0
              ? "Cotacao e imagens salvas."
              : "Cotacao salva."
        );
      }
      navigate(`/quotations/${savedQuotation.id}`);
    } catch (error) {
      treatAxiosError(error);
    }
  });

  if (isEditing && isFetchingQuotation && !quotation) {
    return (
      <div className="p-4 lg:p-6">
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            Carregando cotacao para edicao...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isEditing && (isQuotationError || (!isFetchingQuotation && !quotation))) {
    return (
      <div className="p-4 lg:p-6">
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col items-start gap-4 py-10">
            <div>
              <p className="font-semibold">Cotacao nao encontrada</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Confirme a organizacao ativa e tente novamente.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => refetchQuotation()}>
                Tentar novamente
              </Button>
              <Button asChild>
                <Link to="/quotations">Voltar para cotacoes</Link>
              </Button>
            </div>
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
              Toda cotacao precisa identificar quem recebera a proposta.
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
        noValidate
        className="flex flex-col gap-6 px-4 py-5 lg:px-6 lg:py-7"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="ghost" className="w-fit" asChild>
            <Link
              to={isEditing ? `/quotations/${quotationId}` : "/quotations"}
            >
              <IconArrowLeft />
              Voltar
            </Link>
          </Button>
          <Button type="submit" isLoading={isSaving}>
            <IconDeviceFloppy />
            {isEditing ? "Salvar alteracoes" : "Salvar cotacao"}
          </Button>
        </div>

        <section className="relative overflow-hidden rounded-2xl border bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_40%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent)] p-5 sm:p-7">
          <IconFileInvoice className="absolute -bottom-8 -right-5 size-40 text-emerald-400/[0.06]" />
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
            {isEditing ? "Revisao da proposta comercial" : "Nova proposta comercial"}
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            {isEditing ? `Editar cotacao ${quotation?.number ?? ""}` : "Criar cotacao"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {isEditing
              ? "Atualize produtos, valores, condicoes e imagens sem precisar recriar a proposta."
              : "Monte a oferta usando o catalogo. Os dados e precos serao preservados exatamente como estavam no momento do salvamento."}
          </p>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Identificacao da proposta</CardTitle>
            <CardDescription>
              Cliente, numero, situacao comercial e periodo de validade.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label>Cliente</Label>
              <Controller
                control={control}
                name="customerId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={handleCustomerChange}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isFetchingCustomers
                            ? "Carregando clientes..."
                            : "Selecione o cliente"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.tradeName || customer.legalName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <ErrorText message={errors.customerId?.message} />
            </div>
            <Field label="Numero da cotacao" error={errors.number?.message}>
              <Input placeholder="COT-2026-001" {...register("number")} />
            </Field>
            <Field label="Situacao">
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Rascunho</SelectItem>
                      <SelectItem value="SENT">Enviada</SelectItem>
                      <SelectItem value="APPROVED">Aprovada</SelectItem>
                      <SelectItem value="REJECTED">Recusada</SelectItem>
                      <SelectItem value="CANCELLED">Cancelada</SelectItem>
                      <SelectItem value="EXPIRED">Expirada</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Data de emissao" error={errors.issuedAt?.message}>
              <Input type="date" {...register("issuedAt")} />
            </Field>
            <Field label="Valida ate" error={errors.validUntil?.message}>
              <Input type="date" {...register("validUntil")} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados da empresa</CardTitle>
            <CardDescription>
              Estas informacoes aparecerao no cabecalho e no rodape do PDF.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Razao social ou nome" error={errors.sellerName?.message}>
              <Input {...register("sellerName")} />
            </Field>
            <Field label="CNPJ ou CPF">
              <Input placeholder="Opcional" {...register("sellerDocument")} />
            </Field>
            <Field label="E-mail" error={errors.sellerEmail?.message}>
              <Input type="email" placeholder="Opcional" {...register("sellerEmail")} />
            </Field>
            <Field label="Telefone">
              <Input placeholder="Opcional" {...register("sellerPhone")} />
            </Field>
            <div className="space-y-2 sm:col-span-2">
              <Label>Endereco da empresa</Label>
              <Textarea rows={3} placeholder="Opcional" {...register("sellerAddress")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produtos e valores oferecidos</CardTitle>
            <CardDescription>
              O preco de venda mais recente e sugerido quando existir, mas pode
              ser alterado livremente nesta proposta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => {
              const item = watchedItems[index];
              const selectedProduct = availableProducts.find(
                (product) => product.id === item?.productId
              );
              const localImages = imagesByFieldId[field.fieldKey] ?? [];
              const existingImages = item?.id
                ? (existingImagesByItemId[item.id] ?? []).filter(
                    (image) => !removedImageIds.has(image.id)
                  )
                : [];
              const currentImageCount =
                existingImages.length + localImages.length;
              const lineTotal = calculateLineTotal(
                item?.quantity ?? 0,
                item?.unitPrice ?? 0
              );

              return (
                <article
                  key={field.fieldKey}
                  className="rounded-2xl border bg-muted/10 p-4 sm:p-5"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-sm font-semibold text-emerald-400">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">Produto da cotacao</p>
                        {selectedProduct && (
                          <p className="text-xs text-muted-foreground">
                            {[selectedProduct.code, selectedProduct.brand, selectedProduct.packaging]
                              .filter(Boolean)
                              .join(" | ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={fields.length === 1}
                      onClick={() => removeItem(index)}
                      aria-label={`Remover produto ${index + 1}`}
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
                      <Label>Produto</Label>
                      <Controller
                        control={control}
                        name={`items.${index}.productId`}
                        render={({ field: productField }) => (
                          <ProductCombobox
                            products={availableProducts}
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
                      <div className="flex items-center justify-between gap-3">
                        <ErrorText
                          message={errors.items?.[index]?.productId?.message}
                        />
                        <button
                          type="button"
                          className="ml-auto text-xs font-medium text-emerald-400 hover:text-emerald-300"
                          onClick={() => setQuickProductItemIndex(index)}
                        >
                          Nao encontrou? Criar produto
                        </button>
                      </div>
                    </div>
                    <Field
                      label="Quantidade"
                      error={errors.items?.[index]?.quantity?.message}
                    >
                      <Input
                        type="number"
                        min="0.001"
                        step="0.001"
                        {...register(`items.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                      />
                    </Field>
                    <Field
                      label="Valor unitario"
                      error={errors.items?.[index]?.unitPrice?.message}
                    >
                      <Controller
                        control={control}
                        name={`items.${index}.unitPrice`}
                        render={({ field: priceField }) => (
                          <InputCurrency
                            variant="field"
                            value={priceField.value}
                            onChange={priceField.onChange}
                            error={errors.items?.[index]?.unitPrice?.message}
                          />
                        )}
                      />
                    </Field>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
                    <Field label="Observacao deste produto">
                      <Textarea
                        rows={3}
                        placeholder="Opcional. Ex.: marca equivalente mediante aprovacao."
                        {...register(`items.${index}.notes`)}
                      />
                    </Field>
                    <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/[0.05] p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Total da linha
                      </p>
                      <p className="mt-2 text-xl font-semibold text-emerald-300">
                        {formatQuotationCurrency(lineTotal)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item?.quantity || 0} x {formatQuotationCurrency(item?.unitPrice || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-dashed p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="flex items-center gap-2 text-sm font-medium">
                          <IconPhotoPlus className="size-4 text-emerald-400" />
                          Imagens deste produto
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Opcional. Ate 3 arquivos JPG, PNG ou WEBP de 3 MB cada.
                        </p>
                      </div>
                      {currentImageCount < MAX_IMAGES_PER_ITEM && (
                        <label
                          htmlFor={`quotation-images-${field.fieldKey}`}
                          className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          <IconPlus className="size-4" />
                          Adicionar imagem
                        </label>
                      )}
                      <input
                        id={`quotation-images-${field.fieldKey}`}
                        type="file"
                        accept={ACCEPTED_IMAGE_TYPES.join(",")}
                        multiple
                        className="sr-only"
                        onChange={(event) => {
                          handleImagesSelected(
                            field.fieldKey,
                            event.target.files,
                            existingImages.length
                          );
                          event.target.value = "";
                        }}
                      />
                    </div>

                    {currentImageCount > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {existingImages.map((image) => (
                          <div
                            key={image.id}
                            className="group/image relative overflow-hidden rounded-xl border bg-background"
                          >
                            <img
                              src={image.url}
                              alt={image.fileName}
                              className="aspect-[4/3] w-full object-cover"
                            />
                            <button
                              type="button"
                              className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/70 text-white hover:bg-red-600"
                              onClick={() => removeExistingImage(image.id)}
                              aria-label={`Remover ${image.fileName}`}
                            >
                              <IconX className="size-4" />
                            </button>
                            <p className="truncate px-2 py-2 text-xs text-muted-foreground">
                              {image.fileName}
                            </p>
                          </div>
                        ))}
                        {localImages.map((image) => (
                          <div
                            key={image.id}
                            className="group/image relative overflow-hidden rounded-xl border bg-background"
                          >
                            <img
                              src={image.previewUrl}
                              alt={image.file.name}
                              className="aspect-[4/3] w-full object-cover"
                            />
                            <button
                              type="button"
                              className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/70 text-white hover:bg-red-600"
                              onClick={() =>
                                removeImage(field.fieldKey, image.id)
                              }
                              aria-label={`Remover ${image.file.name}`}
                            >
                              <IconX className="size-4" />
                            </button>
                            <p className="truncate px-2 py-2 text-xs text-muted-foreground">
                              {image.file.name}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}

            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed py-6"
              onClick={() =>
                append(
                  newItem(
                    Math.max(0, ...getValues("items").map((item) => item.lineNumber || 0)) + 1
                  )
                )
              }
            >
              <IconPlus />
              Adicionar outro produto
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Card>
            <CardHeader>
              <CardTitle>Condicoes e observacoes</CardTitle>
              <CardDescription>
                Informacoes comerciais que acompanham a proposta.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Endereco do cliente</Label>
                <Textarea rows={3} placeholder="Opcional" {...register("customerAddress")} />
              </div>
              <Field label="Condicao de pagamento">
                <Textarea rows={4} placeholder="Ex.: 30 dias apos faturamento" {...register("paymentTerms")} />
              </Field>
              <Field label="Condicao de entrega">
                <Textarea rows={4} placeholder="Ex.: entrega em ate 10 dias uteis" {...register("deliveryTerms")} />
              </Field>
              <div className="space-y-2 sm:col-span-2">
                <Label>Observacoes para o cliente</Label>
                <Textarea rows={4} placeholder="Opcional. Esta informacao aparecera no PDF." {...register("notes")} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Observacoes internas</Label>
                <Textarea rows={3} placeholder="Opcional. Nao aparecera no PDF." {...register("internalNotes")} />
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <IconInfoCircle className="size-3.5" />
                  Campo visivel apenas dentro do sistema.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="h-fit border-emerald-400/15 bg-emerald-500/[0.03] xl:sticky xl:top-6">
            <CardHeader>
              <CardTitle>Resumo da cotacao</CardTitle>
              <CardDescription>
                Valores calculados automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SummaryRow label="Subtotal dos produtos" value={subtotal} />
              <Field label="Frete" error={errors.freight?.message}>
                <Controller
                  control={control}
                  name="freight"
                  render={({ field }) => (
                    <InputCurrency
                      variant="field"
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.freight?.message}
                    />
                  )}
                />
              </Field>
              <Field label="Desconto" error={errors.discount?.message}>
                <Controller
                  control={control}
                  name="discount"
                  render={({ field }) => (
                    <InputCurrency
                      variant="field"
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.discount?.message}
                    />
                  )}
                />
              </Field>
              <div className="border-t pt-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Valor final da proposta
                </p>
                <p className="mt-2 text-3xl font-semibold text-emerald-300">
                  {formatQuotationCurrency(Math.max(0, total))}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {fields.length} {fields.length === 1 ? "produto" : "produtos"}
                  {totalImages > 0 ? ` e ${totalImages} imagem(ns)` : ""}
                </p>
              </div>
              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isSaving}
              >
                <IconDeviceFloppy />
                {isEditing ? "Salvar alteracoes" : "Salvar e revisar"}
              </Button>
            </CardContent>
          </Card>
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
      <ErrorText message={error} />
    </div>
  );
}

function ErrorText({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{formatQuotationCurrency(value)}</span>
    </div>
  );
}
