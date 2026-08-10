export type PaymentMethod =
  | "PIX"
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "BOLETO"
  | "BANK_TRANSFER"
  | "CASH"
  | "OTHER";

export type PayableStatus = "OPEN" | "PAID" | "CANCELLED";

export type Payable = {
  id: string;
  entityId: string;
  acquisitionId: string;
  creditCardId?: string;
  description: string;
  sellerName?: string;
  orderNumber: string;
  cardName?: string;
  cardLastFour?: string;
  paymentMethod: PaymentMethod;
  installmentNumber: number;
  installmentCount: number;
  amount: number;
  dueAt: string;
  status: PayableStatus;
  paidAt?: string;
  overdue: boolean;
};

export type PayablesSummary = {
  openAmount: number;
  overdueAmount: number;
  dueNext30DaysAmount: number;
  paidAmount: number;
  openCount: number;
  overdueCount: number;
};

export type PayablesResult = {
  payables: Payable[];
  summary: PayablesSummary;
};

export type CreditCardStatementSettlement = {
  creditCardId: string;
  year: number;
  month: number;
  paidAt: string;
  settledCount: number;
  settledAmount: number;
};
