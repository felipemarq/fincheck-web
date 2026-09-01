export type QuotationStatus =
  | "DRAFT"
  | "SENT"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

export type QuotationItemImage = {
  id: string;
  entityId: string;
  quotationId: string;
  quotationItemId: string;
  fileName: string;
  contentType: string;
  size: number;
  sortOrder: number;
  url: string;
  createdAt?: string;
};

export type QuotationItem = {
  id: string;
  entityId: string;
  quotationId: string;
  productId: string;
  lineNumber: number;
  productCode?: string;
  description: string;
  brand: string;
  specification?: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string;
  images: QuotationItemImage[];
  createdAt?: string;
  updatedAt?: string;
};

export type QuotationSummary = {
  id: string;
  entityId: string;
  customerId: string;
  createdByUserId: string;
  updatedByUserId: string;
  number: string;
  status: QuotationStatus;
  issuedAt: string;
  validUntil?: string;
  sellerName: string;
  sellerTradeName?: string;
  sellerDocument?: string;
  sellerEmail?: string;
  sellerPhone?: string;
  sellerAddress?: string;
  sellerPrimaryColor: string;
  sellerLogoAssetId?: string;
  sellerLogoUrl?: string;
  brandingLockedAt?: string;
  customerLegalName: string;
  customerTradeName?: string;
  customerDocument: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  notes?: string;
  subtotal: number;
  freight: number;
  discount: number;
  total: number;
  itemCount: number;
  imageCount: number;
  createdAt?: string;
  updatedAt?: string;
};

export type Quotation = Omit<QuotationSummary, "itemCount" | "imageCount"> & {
  internalNotes?: string;
  items: QuotationItem[];
};

export type QuotationInput = {
  customerId: string;
  number: string;
  status?: QuotationStatus;
  issuedAt: string;
  validUntil?: string;
  sellerName: string;
  sellerDocument?: string;
  sellerEmail?: string;
  sellerPhone?: string;
  sellerAddress?: string;
  customerAddress?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  notes?: string;
  internalNotes?: string;
  freight?: number;
  discount?: number;
  items: Array<{
    id?: string;
    productId: string;
    lineNumber: number;
    quantity: number;
    unitPrice: number;
    notes?: string;
  }>;
};
