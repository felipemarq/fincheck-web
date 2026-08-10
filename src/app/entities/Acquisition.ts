export type AcquisitionStatus =
  | "PLACED"
  | "IN_TRANSIT"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

export type AcquisitionPaymentMethod =
  | "PIX"
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "BOLETO"
  | "BANK_TRANSFER"
  | "CASH"
  | "OTHER";

export type AcquisitionAllocation = {
  id?: string;
  purchaseOrderItemId: string;
  purchaseOrderId: string;
  orderNumber: string;
  customerName: string;
  lineNumber: number;
  description: string;
  originalUnit: string;
  allocatedQuantity: number;
  itemCost: number;
  shippingCost: number;
  otherExpenses: number;
  generalDiscount: number;
  totalCost: number;
  notes?: string;
};

export type AcquisitionItem = {
  id?: string;
  productId: string;
  description: string;
  brand: string;
  packaging: string;
  normalizedUnit: string;
  acquiredQuantity: number;
  allocatedQuantity: number;
  unallocatedQuantity: number;
  costUnitPrice: number;
  grossCost: number;
  lineDiscount: number;
  totalCost: number;
  notes?: string;
  allocations: AcquisitionAllocation[];
};

export type Acquisition = {
  id: string;
  entityId: string;
  purchaseOrderId?: string;
  sellerName?: string;
  sellerDocument?: string;
  channel?: string;
  sellerOrderNumber?: string;
  purchasedAt: string;
  buyerName: string;
  paymentMethod: string;
  paymentInstrument?: string;
  paymentHolder?: string;
  creditCardId?: string;
  installmentCount: number;
  firstPaymentDueAt?: string;
  shippingCost: number;
  generalDiscount: number;
  otherExpenses: number;
  status: AcquisitionStatus;
  notes?: string;
  itemCount: number;
  destinationCount: number;
  relatedOrderCount: number;
  unallocatedItemCount: number;
  itemsSubtotal: number;
  totalCost: number;
  allocatedCostForCurrentOrder?: number;
  items: AcquisitionItem[];
  createdAt: string;
  updatedAt: string;
};

export type AcquisitionAllocationInput = {
  id?: string;
  purchaseOrderItemId: string;
  allocatedQuantity: number;
  notes?: string | null;
};

export type AcquisitionItemInput = {
  id?: string;
  productId?: string;
  purchaseOrderItemId?: string;
  acquiredQuantity: number;
  costUnitPrice: number;
  lineDiscount?: number;
  notes?: string | null;
  allocations?: AcquisitionAllocationInput[];
};

export type AcquisitionInput = {
  sellerName?: string | null;
  sellerDocument?: string | null;
  channel?: string | null;
  sellerOrderNumber?: string | null;
  purchasedAt: string;
  buyerName: string;
  paymentMethod: AcquisitionPaymentMethod;
  paymentInstrument?: string | null;
  paymentHolder?: string | null;
  creditCardId?: string | null;
  installmentCount?: number;
  firstPaymentDueAt?: string | null;
  shippingCost: number;
  generalDiscount: number;
  otherExpenses: number;
  status: "PLACED" | "IN_TRANSIT" | "CANCELLED";
  notes?: string | null;
  items: AcquisitionItemInput[];
};
