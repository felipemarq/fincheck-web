export type Customer = {
  id: string;
  entityId: string;
  createdByUserId: string;
  updatedByUserId: string;
  legalName: string;
  tradeName?: string;
  document: string;
  email?: string;
  phone?: string;
  billingAddress?: string;
  deliveryAddress?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
