import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  IconCheck,
  IconChevronDown,
  IconSearch,
} from "@tabler/icons-react";
import * as React from "react";

import type { Product } from "@/app/entities/Product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ProductComboboxProps = {
  products: Product[];
  value?: string;
  onValueChange: (productId: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
};

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getProductLabel(product: Product) {
  return `${product.code ? `${product.code} - ` : ""}${product.name}`;
}

function getProductSearchScore(product: Product, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 0;

  const normalizedCode = normalizeSearchText(product.code ?? "");
  const normalizedName = normalizeSearchText(product.name);
  const searchableText = normalizeSearchText(
    [
      product.code,
      product.name,
      product.brand,
      product.specification,
      product.packaging,
    ]
      .filter(Boolean)
      .join(" ")
  );
  const compactSearchableText = searchableText.replaceAll(" ", "");
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  const matchesAllTokens = tokens.every(
    (token) =>
      searchableText.includes(token) || compactSearchableText.includes(token)
  );

  if (!matchesAllTokens) return -1;
  if (normalizedCode === normalizedQuery) return 500;
  if (normalizedCode.startsWith(normalizedQuery)) return 400;
  if (normalizedName.startsWith(normalizedQuery)) return 300;
  if (normalizedName.includes(normalizedQuery)) return 200;
  if (searchableText.includes(normalizedQuery)) return 100;

  return 50;
}

export function ProductCombobox({
  products,
  value,
  onValueChange,
  placeholder = "Selecione o produto",
  searchPlaceholder = "Pesquisar por nome, codigo ou marca...",
  emptyMessage = "Nenhum produto encontrado.",
  disabled = false,
  className,
}: ProductComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const deferredQuery = React.useDeferredValue(query);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const selectedProduct = products.find((product) => product.id === value);
  const filteredProducts = products
    .map((product) => ({
      product,
      score: getProductSearchScore(product, deferredQuery),
    }))
    .filter(({ score }) => score >= 0)
    .sort(
      (first, second) =>
        second.score - first.score ||
        first.product.name.localeCompare(second.product.name, "pt-BR", {
          numeric: true,
        })
    )
    .map(({ product }) => product);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setQuery("");
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={placeholder}
          disabled={disabled}
          className={cn("w-full min-w-0 justify-between px-3", className)}
        >
          <span
            className={cn(
              "min-w-0 truncate text-left",
              !selectedProduct && "text-muted-foreground"
            )}
            translate="no"
          >
            {selectedProduct ? getProductLabel(selectedProduct) : placeholder}
          </span>
          <IconChevronDown className="size-4 opacity-50" />
        </Button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          collisionPadding={12}
          className="z-[110] w-[var(--radix-popover-trigger-width)] min-w-[20rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            requestAnimationFrame(() => searchInputRef.current?.focus());
          }}
        >
          <div className="border-b p-2">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label="Pesquisar produtos"
                autoComplete="off"
                className="pl-8"
              />
            </div>
          </div>

          <div
            role="listbox"
            aria-label="Produtos"
            className="max-h-72 overflow-y-auto p-1"
          >
            {filteredProducts.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </p>
            ) : (
              filteredProducts.map((product) => {
                const selected = product.id === value;

                return (
                  <button
                    key={product.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className="flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
                    onClick={() => {
                      onValueChange(product.id);
                      handleOpenChange(false);
                    }}
                  >
                    <IconCheck
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        selected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="min-w-0" translate="no">
                      <span className="block font-medium">
                        {getProductLabel(product)}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[product.brand, product.specification, product.packaging]
                          .filter(Boolean)
                          .join(" | ")}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t px-3 py-2 text-xs text-muted-foreground">
            {filteredProducts.length} de {products.length} produtos
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
