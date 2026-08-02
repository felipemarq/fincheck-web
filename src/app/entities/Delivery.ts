export type DeliveryStatus =
  | "PREPARING"
  | "DISPATCHED"
  | "DELIVERED"
  | "CANCELLED";

export type DeliveryItem = {
  id?: string;
  purchaseOrderItemId: string;
  lineNumber: number;
  description: string;
  originalUnit: string;
  deliveredQuantity: number;
  notes?: string;
};

export type Delivery = {
  id: string;
  entityId: string;
  purchaseOrderId: string;
  status: DeliveryStatus;
  dispatchedAt?: string;
  deliveredAt?: string;
  freightCost: number;
  notes?: string;
  totalQuantity: number;
  items: DeliveryItem[];
  createdAt: string;
  updatedAt: string;
};

export type DeliveryInput = {
  status: DeliveryStatus;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
  freightCost?: number;
  notes?: string | null;
  items: Array<{
    id?: string;
    purchaseOrderItemId: string;
    deliveredQuantity: number;
    notes?: string;
  }>;
};
