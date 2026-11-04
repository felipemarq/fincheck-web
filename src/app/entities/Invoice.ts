export type InvoiceStatus = "DRAFT" | "ISSUED" | "CANCELLED";
export type InvoiceOperationType = "SALE" | "SALES_RETURN" | "PURCHASE_RETURN";
export type ReceivableStatus =
  | "NOT_ISSUED"
  | "NOT_APPLICABLE"
  | "RETURNED"
  | "OPEN"
  | "OVERDUE"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";
// Fiscal returns remain visible without creating a customer receivable.
export type ReceivablePaymentStatus = "CONFIRMED" | "CANCELLED";

export type InvoiceItem = {
  id?: string;
  purchaseOrderItemId?: string;
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
  purchaseOrderId?: string;
  customerId?: string;
  operationType: InvoiceOperationType;
  referencedInvoiceId?: string;
  documentAmount: number;
  returnedAmount: number;
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
  customerId?: string;
  operationType?: InvoiceOperationType;
  referencedInvoiceId?: string | null;
  invoiceNumber: string;
  issuedAt: string;
  dueAt: string;
  taxAmount: number;
  otherDeductions: number;
  status: InvoiceStatus;
  notes?: string | null;
  items: Array<{
    id?: string;
    purchaseOrderItemId?: string;
    description?: string;
    originalUnit?: string;
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
