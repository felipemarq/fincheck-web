export type AcquisitionReceiptStatus = "CONFIRMED" | "CANCELLED";

export type AcquisitionReceiptItem = {
  id?: string;
  acquisitionItemId: string;
  purchaseOrderItemId: string;
  lineNumber: number;
  description: string;
  originalUnit: string;
  acquiredQuantity: number;
  receivedQuantity: number;
  notes?: string;
};

export type AcquisitionReceipt = {
  id: string;
  entityId: string;
  purchaseOrderId: string;
  acquisitionId: string;
  receivedAt: string;
  status: AcquisitionReceiptStatus;
  notes?: string;
  totalQuantity: number;
  items: AcquisitionReceiptItem[];
  createdAt: string;
  updatedAt: string;
};

export type AcquisitionReceiptInput = {
  receivedAt: string;
  status?: AcquisitionReceiptStatus;
  notes?: string | null;
  items: Array<{
    id?: string;
    acquisitionItemId: string;
    purchaseOrderItemId: string;
    receivedQuantity: number;
    notes?: string;
  }>;
};
