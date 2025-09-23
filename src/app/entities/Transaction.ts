export namespace Transaction {
  export type Attributes = {
    id?: string;
    entityId: string;
    userId: string;
    accountId: string;
    categoryId: string;
    creditCardId?: string;
    installmentPurchaseId?: string;
    contactId?: string;
    name: string;
    date: Date;
    dueDate?: Date;
    type: Transaction.Type;
    isPaid: boolean;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
    value: number;
  };

  export enum Type {
    INCOME = "INCOME",
    EXPENSE = "EXPENSE",
  }
}
