export type InvoiceStatus = "DRAFT" | "ISSUED" | "CANCELLED";
export type ReceivableStatus =
  | "NOT_ISSUED"
  | "OPEN"
  | "OVERDUE"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";
export type ReceivablePaymentStatus = "CONFIRMED" | "CANCELLED";

export type InvoiceItem = {
  id?: string;
  purchaseOrderItemId: string;
  lineNumber: number;
  description: string;
  originalUnit: string;
  invoicedQuantity: number;
  unitPrice: number;
  totalAmount: number;
  notes?: string;
};

export type ReceivablePayment = {
  id: string;
  receivedAt: string;
  amount: number;
  paymentMethod: string;
  reference?: string;
  status: ReceivablePaymentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type Invoice = {
  id: string;
  entityId: string;
  purchaseOrderId: string;
  invoiceNumber: string;
  issuedAt: string;
  dueAt: string;
  grossAmount: number;
  taxAmount: number;
  otherDeductions: number;
  netReceivableAmount: number;
  receivedAmount: number;
  outstandingAmount: number;
  status: InvoiceStatus;
  receivableStatus: ReceivableStatus;
  notes?: string;
  items: InvoiceItem[];
  payments: ReceivablePayment[];
  createdAt: string;
  updatedAt: string;
};

export type InvoiceInput = {
  invoiceNumber: string;
  issuedAt: string;
  dueAt: string;
  taxAmount: number;
  otherDeductions: number;
  status: InvoiceStatus;
  notes?: string | null;
  items: Array<{
    id?: string;
    purchaseOrderItemId: string;
    invoicedQuantity: number;
    unitPrice: number;
    notes?: string;
  }>;
};

export type ReceivablePaymentInput = {
  receivedAt: string;
  amount: number;
  paymentMethod: string;
  reference?: string | null;
  status?: ReceivablePaymentStatus;
  notes?: string | null;
};
