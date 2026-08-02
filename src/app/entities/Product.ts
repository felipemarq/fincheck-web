export type Product = {
  id: string;
  entityId: string;
  createdByUserId: string;
  updatedByUserId: string;
  name: string;
  brand: string;
  specification?: string;
  packaging: string;
  normalizedUnit: string;
  lastPurchasePrice?: number;
  lastPurchaseSource?: string;
  lastPurchasedAt?: string;
  lastSalePrice?: number;
  lastSoldAt?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export const PRODUCT_PACKAGING_OPTIONS = [
  { value: "UN", label: "Unidade", normalizedUnit: "UNIT" },
  { value: "CX", label: "Caixa", normalizedUnit: "BOX" },
  { value: "KIT", label: "Kit", normalizedUnit: "KIT" },
  { value: "PCT", label: "Pacote", normalizedUnit: "PACKAGE" },
  { value: "PAR", label: "Par", normalizedUnit: "PAIR" },
  { value: "FR", label: "Frasco", normalizedUnit: "BOTTLE" },
  { value: "RL", label: "Rolo", normalizedUnit: "ROLL" },
  { value: "OUTRO", label: "Outro", normalizedUnit: "OTHER" },
] as const;

export function getPackagingLabel(packaging: string) {
  return (
    PRODUCT_PACKAGING_OPTIONS.find((option) => option.value === packaging)
      ?.label ?? packaging
  );
}
