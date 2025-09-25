export namespace Transaction {
  export type Attributes = {
    id: string;
    entityId: string;
    userId: string;
    accountId: string;
    categoryId: string;
    creditCardId?: string;
    installmentPurchaseId?: string;
    contactId?: string;
    name: string;
    date: string;
    dueDate?: string;
    type: Transaction.Type;
    isPaid: boolean;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    value: number;
  };

  export enum Type {
    INCOME = "INCOME",
    EXPENSE = "EXPENSE",
  }
}
