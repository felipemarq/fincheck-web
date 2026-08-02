export type PurchaseOrderLifecycleStatus = "DRAFT" | "ACTIVE" | "CANCELLED";
export type PurchaseOrderProgress =
  | "DRAFT"
  | "CANCELLED"
  | "PENDING_PURCHASE"
  | "PARTIALLY_PURCHASED"
  | "PURCHASED"
  | "PARTIALLY_RECEIVED"
  | "READY_FOR_DELIVERY"
  | "IN_DELIVERY"
  | "PARTIALLY_DELIVERED"
  | "DELIVERED";

export type PurchaseOrderItemProgress =
  | "PENDING_PURCHASE"
  | "PARTIALLY_PURCHASED"
  | "PURCHASED_AWAITING_ARRIVAL"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED_AWAITING_DELIVERY"
  | "IN_DELIVERY"
  | "PARTIALLY_DELIVERED"
  | "DELIVERED";

export type PurchaseOrderCustomer = {
  id: string;
  legalName: string;
  tradeName?: string;
  document: string;
  active: boolean;
};

export type PurchaseOrderItem = {
  id?: string;
  productId: string;
  lineNumber: number;
  description: string;
  brand: string;
  specification?: string;
  originalUnit: string;
  normalizedUnit: string;
  orderedQuantity: number;
  saleUnitPrice: number;
  officialTotal: number;
  notes?: string;
  acquiredQuantity: number;
  purchasePendingQuantity: number;
  receivedQuantity: number;
  receiptPendingQuantity: number;
  committedDeliveryQuantity: number;
  availableForDeliveryQuantity: number;
  deliveredQuantity: number;
  deliveryPendingQuantity: number;
  invoicedQuantity: number;
  invoicePendingQuantity: number;
  excessQuantity: number;
  progress: PurchaseOrderItemProgress;
};

export type PurchaseOrderSummary = {
  id: string;
  entityId: string;
  customerId: string;
  customer: PurchaseOrderCustomer;
  orderNumber: string;
  externalNumber?: string;
  quoteNumber?: string;
  requisitionNumber?: string;
  issuedAt: string;
  requestedDeliveryAt?: string;
  officialTotal: number;
  calculatedItemsTotal: number;
  hasTotalMismatch: boolean;
  paymentTerms?: string;
  instructions?: string;
  notes?: string;
  billingAddress?: string;
  deliveryAddress?: string;
  lifecycleStatus: PurchaseOrderLifecycleStatus;
  progress: PurchaseOrderProgress;
  itemCount: number;
  acquisitionCount: number;
  knownAcquisitionCost: number;
  deliveryCount: number;
  deliveryCost: number;
  invoiceCount: number;
  invoicedRevenue: number;
  taxCost: number;
  otherDeductions: number;
  receivedRevenue: number;
  receivableBalance: number;
  projectedMargin: number;
  invoicedMargin: number;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseOrder = PurchaseOrderSummary & {
  items: PurchaseOrderItem[];
};

export type PurchaseOrderItemInput = {
  id?: string;
  productId: string;
  lineNumber: number;
  description: string;
  brand: string;
  specification?: string | null;
  originalUnit: string;
  normalizedUnit: string;
  orderedQuantity: number;
  saleUnitPrice: number;
  officialTotal: number;
  notes?: string | null;
};

export type PurchaseOrderInput = {
  customerId: string;
  orderNumber: string;
  externalNumber?: string | null;
  quoteNumber?: string | null;
  requisitionNumber?: string | null;
  issuedAt: string;
  requestedDeliveryAt?: string | null;
  officialTotal: number;
  paymentTerms?: string | null;
  instructions?: string | null;
  notes?: string | null;
  billingAddress?: string | null;
  deliveryAddress?: string | null;
  lifecycleStatus: PurchaseOrderLifecycleStatus;
  items: PurchaseOrderItemInput[];
};
