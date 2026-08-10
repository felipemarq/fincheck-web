import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { productQueryKeys } from "@/app/config/QueryKeys";
import {
  PRODUCT_PACKAGING_OPTIONS,
  type Product,
} from "@/app/entities/Product";
import { useAuth } from "@/app/hooks/useAuth";
import { productService } from "@/app/services/productService";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { InputCurrency } from "@/view/components/InputCurrency";

const productSchema = z
  .object({
    code: z.string().trim().max(80),
    name: z.string().trim().min(1, "Informe o nome do produto.").max(240),
    brand: z.string().trim().max(120),
    specification: z.string().trim().max(4000),
    packaging: z.string().trim().min(1, "Selecione a embalagem.").max(40),
    customPackaging: z.string().trim().max(40),
    normalizedUnit: z.string().trim().min(1).max(40),
    lastPurchasePrice: z.number().nonnegative(),
    lastPurchaseSource: z.string().trim().max(160),
    lastSalePrice: z.number().nonnegative(),
    active: z.boolean(),
  })
  .superRefine((data, context) => {
    if (data.packaging === "OUTRO" && !data.customPackaging) {
      context.addIssue({
        code: "custom",
        path: ["customPackaging"],
        message: "Informe qual e a embalagem.",
      });
    }
  });

type ProductFormData = z.infer<typeof productSchema>;

const emptyProduct: ProductFormData = {
  code: "",
  name: "",
  brand: "Outros",
  specification: "",
  packaging: "UN",
  customPackaging: "",
  normalizedUnit: "UNIT",
  lastPurchasePrice: 0,
  lastPurchaseSource: "",
  lastSalePrice: 0,
  active: true,
};

type ProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  onCreated?: (product: Product) => void;
};

export function ProductModal({
  isOpen,
  onClose,
  product,
  onCreated,
}: ProductModalProps) {
  const { selectedEntityId } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = Boolean(product);

  const {
    control,
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyProduct,
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    reset(
      product
        ? {
            code: product.code ?? "",
            name: product.name,
            brand: product.brand,
            specification: product.specification ?? "",
            packaging: PRODUCT_PACKAGING_OPTIONS.some(
              (option) => option.value === product.packaging
            )
              ? product.packaging
              : "OUTRO",
            customPackaging: PRODUCT_PACKAGING_OPTIONS.some(
              (option) => option.value === product.packaging
            )
              ? ""
              : product.packaging,
            normalizedUnit: product.normalizedUnit,
            lastPurchasePrice: product.lastPurchasePrice ?? 0,
            lastPurchaseSource: product.lastPurchaseSource ?? "",
            lastSalePrice: product.lastSalePrice ?? 0,
            active: product.active,
          }
        : emptyProduct
    );
  }, [isOpen, product, reset]);

  const createMutation = useMutation({ mutationFn: productService.create });
  const updateMutation = useMutation({ mutationFn: productService.update });
  const selectedPackaging = watch("packaging");

  const onSubmit = handleSubmit(async (formData) => {
    if (!selectedEntityId) {
      return;
    }

    try {
      let savedProduct: Product;
      const packaging =
        formData.packaging === "OUTRO"
          ? formData.customPackaging.trim().toUpperCase()
          : formData.packaging;

      if (product) {
        savedProduct = await updateMutation.mutateAsync({
          entityId: selectedEntityId,
          productId: product.id,
          code:
            formData.code === (product.code ?? "")
              ? undefined
              : formData.code || null,
          name: formData.name,
          brand: formData.brand || "Outros",
          specification: formData.specification || null,
          packaging,
          normalizedUnit: formData.normalizedUnit,
          lastPurchasePrice:
            formData.lastPurchasePrice === (product.lastPurchasePrice ?? 0)
              ? undefined
              : formData.lastPurchasePrice || null,
          lastPurchaseSource:
            formData.lastPurchaseSource ===
            (product.lastPurchaseSource ?? "")
              ? undefined
              : formData.lastPurchaseSource || null,
          lastSalePrice:
            formData.lastSalePrice === (product.lastSalePrice ?? 0)
              ? undefined
              : formData.lastSalePrice || null,
          active: formData.active,
        });
        toast.success("Produto atualizado.");
      } else {
        savedProduct = await createMutation.mutateAsync({
          entityId: selectedEntityId,
          code: formData.code || undefined,
          name: formData.name,
          brand: formData.brand || undefined,
          specification: formData.specification || undefined,
          packaging,
          normalizedUnit: formData.normalizedUnit,
          lastPurchasePrice: formData.lastPurchasePrice || undefined,
          lastPurchaseSource: formData.lastPurchaseSource || undefined,
          lastSalePrice: formData.lastSalePrice || undefined,
          active: formData.active,
        });
        toast.success("Produto criado.");
      }

      onClose();

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      queryClient.setQueryData<Product[]>(
        productQueryKeys.list({ entityId: selectedEntityId }),
        (currentProducts) => [
          savedProduct,
          ...(currentProducts?.filter(
            (cachedProduct) => cachedProduct.id !== savedProduct.id
          ) ?? []),
        ]
      );

      if (!product) {
        onCreated?.(savedProduct);
      }

      await queryClient.invalidateQueries({
        queryKey: productQueryKeys.entity(selectedEntityId),
      });
    } catch (error) {
      treatAxiosError(error);
    }
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar produto" : "Novo produto"}
          </DialogTitle>
          <DialogDescription>
            Salve os dados reutilizaveis e os precos de referencia. As ordens
            e aquisicoes futuras manterao esses valores atualizados.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="product-name">Nome do produto</Label>
              <Input
                id="product-name"
                placeholder="Ex: Luva cirurgica esteril"
                error={errors.name?.message}
                {...register("name")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-code">Codigo do produto</Label>
              <Input
                id="product-code"
                placeholder="ERP ou SKU (opcional)"
                error={errors.code?.message}
                className="uppercase"
                {...register("code")}
              />
              <p className="text-xs text-muted-foreground">
                Quando informado, deve ser unico nesta organizacao.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-brand">Marca</Label>
              <Input
                id="product-brand"
                placeholder="Outros"
                error={errors.brand?.message}
                {...register("brand")}
              />
              <p className="text-xs text-muted-foreground">
                Quando nao houver marca, usaremos Outros.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Embalagem</Label>
              <Controller
                control={control}
                name="packaging"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      const option = PRODUCT_PACKAGING_OPTIONS.find(
                        (item) => item.value === value
                      );
                      setValue(
                        "normalizedUnit",
                        option?.normalizedUnit ?? "OTHER"
                      );
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_PACKAGING_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label} ({option.value})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.packaging?.message && (
                <p className="text-xs text-destructive">
                  {errors.packaging.message}
                </p>
              )}
            </div>

            {selectedPackaging === "OUTRO" && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="product-custom-packaging">
                  Qual e a embalagem?
                </Label>
                <Input
                  id="product-custom-packaging"
                  placeholder="Ex: Saco, ampola ou galao"
                  error={errors.customPackaging?.message}
                  {...register("customPackaging")}
                />
              </div>
            )}

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="product-specification">
                Especificacao opcional
              </Label>
              <Textarea
                id="product-specification"
                placeholder="Modelo, tamanho, material ou detalhe relevante"
                {...register("specification")}
              />
            </div>
          </div>

          <div className="rounded-2xl border bg-muted/10 p-4">
            <div className="mb-4">
              <p className="font-medium">Referencias de preco</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Sao sugestoes para agilizar a proxima compra ou venda. Deixe
                em zero quando ainda nao houver historico.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Ultimo preco de compra</Label>
                <Controller
                  control={control}
                  name="lastPurchasePrice"
                  render={({ field }) => (
                    <InputCurrency
                      variant="field"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-purchase-source">
                  Marketplace ou fornecedor
                </Label>
                <Input
                  id="product-purchase-source"
                  placeholder="Mercado Livre, Magalu..."
                  {...register("lastPurchaseSource")}
                />
              </div>
              <div className="space-y-2">
                <Label>Ultimo preco de venda</Label>
                <Controller
                  control={control}
                  name="lastSalePrice"
                  render={({ field }) => (
                    <InputCurrency
                      variant="field"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
            </div>
          </div>

          <Controller
            control={control}
            name="active"
            render={({ field }) => (
              <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-4">
                <div>
                  <p className="text-sm font-medium">Produto ativo</p>
                  <p className="text-xs text-muted-foreground">
                    Produtos inativos continuam no historico, mas nao aparecem
                    em novas ordens.
                  </p>
                </div>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />

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
              {isEditing ? "Salvar alteracoes" : "Criar produto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
