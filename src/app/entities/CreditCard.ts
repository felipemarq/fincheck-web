export type CreditCardBrand =
  | "VISA"
  | "MASTERCARD"
  | "ELO"
  | "AMEX"
  | "HIPERCARD"
  | "OTHER";

export type CreditCard = {
  id: string;
  entityId: string;
  name: string;
  holderName: string;
  bank: string;
  brand: CreditCardBrand;
  lastFour: string;
  color: string;
  closingDay: number;
  dueDay: number;
  creditLimit?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreditCardInput = {
  name: string;
  holderName: string;
  bank: string;
  brand: CreditCardBrand;
  lastFour: string;
  color: string;
  closingDay: number;
  dueDay: number;
  creditLimit?: number | null;
  active: boolean;
};
