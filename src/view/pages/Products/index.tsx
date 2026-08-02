import { useDeferredValue, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  IconBox,
  IconBuildingStore,
  IconPencil,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { QueryKeys } from "@/app/config/QueryKeys";
import {
  getPackagingLabel,
  type Product,
} from "@/app/entities/Product";
import { useAuth } from "@/app/hooks/useAuth";
import { useProducts } from "@/app/hooks/useProducts";
import { productService } from "@/app/services/productService";
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
import { ProductModal } from "@/view/modals/ProductModal";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatOptionalCurrency(value?: number) {
  return value === undefined ? "Sem referencia" : currencyFormatter.format(value);
}

export default function Products() {
  const { activeEntity, selectedEntityId } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productBeingEdited, setProductBeingEdited] =
    useState<Product | null>(null);

  const { products, isFetchingProducts, isError, refetch } = useProducts(
    {
      entityId: selectedEntityId ?? "",
      search: deferredSearch || undefined,
    },
    Boolean(selectedEntityId)
  );

  const deleteMutation = useMutation({ mutationFn: productService.remove });
  const activeProducts = products?.filter((product) => product.active).length ?? 0;
  const productsWithPurchaseReference =
    products?.filter((product) => product.lastPurchasePrice !== undefined)
      .length ?? 0;

  const closeModal = () => {
    setIsModalOpen(false);
    setProductBeingEdited(null);
  };

  const handleDelete = async (product: Product) => {
    if (!selectedEntityId) {
      return;
    }

    const confirmed = window.confirm(
      `Deseja excluir o produto "${product.name}"? Produtos com historico devem ser inativados.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        entityId: selectedEntityId,
        productId: product.id,
      });
      toast.success("Produto excluido.");
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.PRODUCTS, selectedEntityId],
      });
    } catch (error) {
      treatAxiosError(error);
    }
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-5 lg:px-6 lg:py-7">
      <section className="relative overflow-hidden rounded-2xl border bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent)] p-5 sm:p-7">
        <div className="absolute -right-12 -top-16 size-48 rounded-full border border-sky-400/10" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-400">
              Catalogo operacional
            </p>
            <h2 className="text-3xl font-semibold tracking-tight">Produtos</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Reutilize nomes, marcas, apresentacoes e precos de referencia
              para precificar ordens sem refazer o cadastro a cada cotacao.
            </p>
          </div>
          <Button
            size="lg"
            className="w-full md:w-auto"
            onClick={() => setIsModalOpen(true)}
          >
            <IconPlus />
            Novo produto
          </Button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="gap-3">
          <CardHeader>
            <CardDescription>Organizacao ativa</CardDescription>
            <CardTitle>{activeEntity?.name ?? "Nenhuma"}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="gap-3">
          <CardHeader>
            <CardDescription>Produtos disponiveis</CardDescription>
            <CardTitle className="text-3xl text-sky-400">
              {activeProducts}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="gap-3">
          <CardHeader>
            <CardDescription>Com referencia de compra</CardDescription>
            <CardTitle className="text-3xl">
              {productsWithPurchaseReference}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="relative max-w-xl">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por produto, marca ou marketplace"
          className="pl-9"
        />
      </div>

      {isFetchingProducts && (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Carregando produtos...
          </CardContent>
        </Card>
      )}

      {isError && (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col items-start gap-3 py-8">
            <p className="font-medium">Nao foi possivel carregar os produtos.</p>
            <Button variant="outline" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {!isFetchingProducts && !isError && !products?.length && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <div className="rounded-2xl bg-sky-500/10 p-4 text-sky-400">
              <IconBox className="size-8" />
            </div>
            <div>
              <p className="font-semibold">Nenhum produto encontrado</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Cadastre o primeiro produto para usa-lo em uma ordem.
              </p>
            </div>
            <Button onClick={() => setIsModalOpen(true)}>
              <IconPlus />
              Criar primeiro produto
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products?.map((product) => (
          <Card
            key={product.id}
            className="group gap-4 overflow-hidden transition-transform duration-200 hover:-translate-y-0.5"
          >
            <div
              className={
                product.active
                  ? "h-1 bg-sky-400"
                  : "h-1 bg-muted-foreground/30"
              }
            />
            <CardHeader className="pt-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardDescription className="flex items-center gap-1.5">
                    <IconBuildingStore className="size-4" />
                    {product.brand} - {getPackagingLabel(product.packaging)}
                  </CardDescription>
                  <CardTitle className="mt-1 line-clamp-2">
                    {product.name}
                  </CardTitle>
                </div>
                <span
                  className={
                    product.active
                      ? "rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-400"
                      : "rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                  }
                >
                  {product.active ? "Ativo" : "Inativo"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {product.specification && (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {product.specification}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 rounded-xl border bg-muted/10 p-3">
                <div>
                  <p className="text-xs text-muted-foreground">Ultima compra</p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatOptionalCurrency(product.lastPurchasePrice)}
                  </p>
                  {product.lastPurchaseSource && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {product.lastPurchaseSource}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ultima venda</p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatOptionalCurrency(product.lastSalePrice)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setProductBeingEdited(product)}
                >
                  <IconPencil />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={deleteMutation.isPending}
                  onClick={() => handleDelete(product)}
                  aria-label={`Excluir ${product.name}`}
                >
                  <IconTrash className="text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ProductModal
        isOpen={isModalOpen || Boolean(productBeingEdited)}
        onClose={closeModal}
        product={productBeingEdited}
      />
    </div>
  );
}
