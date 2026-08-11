import type { Invoice, ReceivableStatus } from "./Invoice";

export type ReceivableFilterStatus = "ALL" | "PENDING" | ReceivableStatus;

export type ReceivableSort =
  | "URGENCY"
  | "DUE_ASC"
  | "DUE_DESC"
  | "BALANCE_DESC"
  | "ISSUED_DESC";

export type Receivable = Invoice & {
  orderNumber: string;
  orderExternalNumber?: string;
  customerId: string;
  customerName: string;
  customerDocument: string;
  daysOverdue: number;
};

export type ReceivablesSummary = {
  totalCount: number;
  issuedCount: number;
  draftCount: number;
  cancelledCount: number;
  receivedCount: number;
  partiallyReceivedCount: number;
  billedAmount: number;
  receivedAmount: number;
  openCount: number;
  openAmount: number;
  overdueCount: number;
  overdueAmount: number;
  dueTodayCount: number;
  dueTodayAmount: number;
  dueNext7DaysCount: number;
  dueNext7DaysAmount: number;
};

export type ReceivablesPage = {
  receivables: Receivable[];
  summary: ReceivablesSummary;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
