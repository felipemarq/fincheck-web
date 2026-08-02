export type AcquisitionStatus =
  | "PLACED"
  | "IN_TRANSIT"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

export type AcquisitionItem = {
  id?: string;
  purchaseOrderItemId: string;
  lineNumber: number;
  description: string;
  brand: string;
  originalUnit: string;
  normalizedUnit: string;
  orderedQuantity: number;
  acquiredQuantity: number;
  costUnitPrice: number;
  grossCost: number;
  lineDiscount: number;
  totalCost: number;
  notes?: string;
};

export type Acquisition = {
  id: string;
  entityId: string;
  purchaseOrderId: string;
  sellerName?: string;
  sellerDocument?: string;
  channel?: string;
  sellerOrderNumber?: string;
  purchasedAt: string;
  buyerName: string;
  paymentMethod: string;
  paymentInstrument?: string;
  paymentHolder?: string;
  shippingCost: number;
  generalDiscount: number;
  otherExpenses: number;
  status: AcquisitionStatus;
  notes?: string;
  itemCount: number;
  itemsSubtotal: number;
  totalCost: number;
  items: AcquisitionItem[];
  createdAt: string;
  updatedAt: string;
};

export type AcquisitionItemInput = {
  id?: string;
  purchaseOrderItemId: string;
  acquiredQuantity: number;
  costUnitPrice: number;
  lineDiscount?: number;
  notes?: string | null;
};

export type AcquisitionInput = {
  sellerName?: string | null;
  sellerDocument?: string | null;
  channel?: string | null;
  sellerOrderNumber?: string | null;
  purchasedAt: string;
  buyerName: string;
  paymentMethod: string;
  paymentInstrument?: string | null;
  paymentHolder?: string | null;
  shippingCost: number;
  generalDiscount: number;
  otherExpenses: number;
  status: "PLACED" | "IN_TRANSIT" | "CANCELLED";
  notes?: string | null;
  items: AcquisitionItemInput[];
};
