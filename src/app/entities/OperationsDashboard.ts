import type { PurchaseOrderProgress } from "./PurchaseOrder";

export type OperationsDashboard = {
  generatedAt: string;
  operational: {
    activeOrders: number;
    pendingPurchaseOrders: number;
    awaitingReceiptOrders: number;
    readyForDeliveryOrders: number;
    inDeliveryOrders: number;
    delayedOrders: number;
  };
  financial: {
    contractedRevenue: number;
    acquisitionCost: number;
    deliveryCost: number;
    invoicedRevenue: number;
    taxCost: number;
    otherDeductions: number;
    receivedRevenue: number;
    receivableBalance: number;
    projectedMargin: number;
    costCoveredRevenue: number;
    knownCostMargin: number;
    invoicedMargin: number;
  };
  receivables: {
    openCount: number;
    overdueCount: number;
    overdueTotal: number;
    dueTodayCount: number;
    dueTodayTotal: number;
  };
  attentionOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    progress: PurchaseOrderProgress;
    requestedDeliveryAt?: string;
    delayed: boolean;
    pendingPurchaseItems: number;
    awaitingReceiptItems: number;
    readyForDeliveryItems: number;
    receivableBalance: number;
  }>;
};
