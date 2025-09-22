export namespace Account {
  export type Attributes = {
    id?: string;
    entityId: string;
    userId: string;
    name: string;
    initialBalance: number;
    type: Account.Type;
    color?: string;
    createdAt?: Date;
    updatedAt?: Date;
  };

  export enum Type {
    CHECKING = "CHECKING",
    INVESTMENT = "INVESTMENT",
    CASH = "CASH",
  }
}
