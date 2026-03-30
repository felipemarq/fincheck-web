export namespace CreditCard {
  export type Attributes = {
    id?: string;
    entityId: string;
    userId: string;
    accountId?: string;
    name: string;
    color?: string;
    creditLimit: number;
    closingDay: number;
    dueDay: number;
    createdAt?: string;
    updatedAt?: string;
  };
}
