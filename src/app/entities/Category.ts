import type { Transaction } from "./Transaction";

export namespace Category {
  export type Attributes = {
    id?: string;
    entityId: string;
    userId: string;
    name: string;
    icon: string;
    type: Transaction.Type;
    createdAt?: Date;
    updatedAt?: Date;
  };
}
