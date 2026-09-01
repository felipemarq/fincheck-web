export enum QueryKeys {
  ME = "me",
  CUSTOMERS = "customers",
  PRODUCTS = "products",
  PURCHASE_ORDERS = "purchaseOrders",
  PURCHASE_ORDER_ITEMS = "purchaseOrderItems",
  ACQUISITIONS = "acquisitions",
  SUPPLIER_PURCHASES = "supplierPurchases",
  ACQUISITION_RECEIPTS = "acquisitionReceipts",
  DELIVERIES = "deliveries",
  INVOICES = "invoices",
  RECEIVABLES = "receivables",
  OPERATIONS_DASHBOARD = "operationsDashboard",
  CREDIT_CARDS = "creditCards",
  PAYABLES = "payables",
  QUOTATIONS = "quotations",
  BODY_WEIGHTS = "bodyWeights",
  PERSONAL_HEALTH_PROFILE = "personalHealthProfile",
  DAILY_CALORIES = "dailyCalories",
  ORGANIZATION_TEAM = "organizationTeam",
  ORGANIZATION_PROFILE = "organizationProfile",
}

type ProductsQueryParams = {
  entityId: string;
  search?: string;
  active?: boolean;
};

export const productQueryKeys = {
  entity: (entityId: string) => [QueryKeys.PRODUCTS, entityId] as const,
  list: ({ entityId, search, active }: ProductsQueryParams) =>
    [QueryKeys.PRODUCTS, entityId, search ?? null, active ?? null] as const,
};
