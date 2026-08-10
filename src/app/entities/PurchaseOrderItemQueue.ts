export type PurchaseOrderItemProcurementStatus =
  | "PENDING_PURCHASE"
  | "PARTIALLY_PURCHASED"
  | "PURCHASED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED";

export type PurchaseOrderItemDeadlineFilter =
  | "OVERDUE"
  | "NEXT_7_DAYS"
  | "NO_DATE";

export type PurchaseOrderItemSort =
  | "URGENCY"
  | "DELIVERY_ASC"
  | "DELIVERY_DESC"
  | "NEWEST"
  | "PRODUCT_ASC"
  | "ORDER_ASC";

export type PurchaseOrderItemQueueItem = {
  id: string;
  productId: string;
  productCode?: string;
  lineNumber: number;
  description: string;
  brand: string;
  specification?: string;
  originalUnit: string;
  orderedQuantity: number;
  saleUnitPrice: number;
  officialTotal: number;
  acquiredQuantity: number;
  purchasePendingQuantity: number;
  receivedQuantity: number;
  receiptPendingQuantity: number;
  procurementStatus: PurchaseOrderItemProcurementStatus;
  isOverdue: boolean;
  order: {
    id: string;
    orderNumber: string;
    externalNumber?: string;
    issuedAt: string;
    requestedDeliveryAt?: string;
  };
  customer: {
    id: string;
    legalName: string;
    tradeName?: string;
  };
};

export type PurchaseOrderItemQueueSummary = {
  total: number;
  pendingPurchase: number;
  partiallyPurchased: number;
  purchased: number;
  partiallyReceived: number;
  received: number;
  overdue: number;
};

export type PurchaseOrderItemQueuePage = {
  items: PurchaseOrderItemQueueItem[];
  summary: PurchaseOrderItemQueueSummary;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
