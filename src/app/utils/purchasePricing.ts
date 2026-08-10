export type PurchasePriceMode = "UNIT" | "TOTAL";

type PurchasePriceInput = {
  mode: PurchasePriceMode;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export function calculatePurchaseLineTotal({
  mode,
  quantity,
  unitPrice,
  totalPrice,
}: PurchasePriceInput): number {
  return mode === "TOTAL" ? totalPrice : quantity * unitPrice;
}

export function calculatePurchaseUnitPrice({
  mode,
  quantity,
  unitPrice,
  totalPrice,
}: PurchasePriceInput): number {
  if (mode === "UNIT") return unitPrice;
  if (quantity <= 0) return 0;

  return Number((totalPrice / quantity).toFixed(6));
}

export function formatCalculatedUnitPrice(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value);
}
