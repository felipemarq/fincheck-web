import type { Transaction } from "./Transaction";

export namespace RecurringTransaction {
  export type Attributes = {
    id: string;
    entityId: string;
    userId: string;
    accountId: string;
    categoryId: string;
    creditCardId?: string;
    name: string;
    value: number;
    startDate: Date;
    endDate?: Date;
    recurrence: RecurringTransaction.Recurrence;
    type: Transaction.Type;
    notes?: string;
    seriesKey?: string;
    createdAt?: Date;
    updatedAt?: Date;
    contactId?: string;
  };

  export enum Recurrence {
    DAILY = "DAILY",
    WEEKLY = "WEEKLY",
    MONTHLY = "MONTHLY",
    YEARLY = "YEARLY",
  }
}
