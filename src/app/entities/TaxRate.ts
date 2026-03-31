export namespace TaxRate {
  export type Attributes = {
    entityId: string;
    userId: string;
    year: number;
    month: number;
    ratePercent: number;
    createdAt?: string;
    updatedAt?: string;
  };
}
