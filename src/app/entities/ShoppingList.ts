export type ShoppingList = {
  id: string; entityId: string; name: string; notes: string | null; archived: boolean;
  createdByUserId: string; updatedByUserId: string; createdAt: string; updatedAt: string;
  totalItems: number; purchasedItems: number; estimatedTotal: number;
};
export type ShoppingListItemInput = {
  url: string;
  title?: string | null;
  productId?: string | null;
  purchaseOrderId?: string | null;
  purchaseOrderItemId?: string | null;
  quantity?: number | null;
  estimatedUnitPrice?: number | null;
  sellerName?: string | null;
  priority?: "NORMAL" | "HIGH" | "URGENT";
  neededBy?: string | null;
  notes?: string | null;
};
export type ShoppingListItem = ShoppingListItemInput & {
  id: string; entityId: string; shoppingListId: string; version: number;
  purchasedAt: string | null; purchasedByUserId: string | null; acquisitionId: string | null;
  createdByUserId: string; updatedByUserId: string; createdAt: string; updatedAt: string;
  productName?: string | null; orderNumber?: string | null; orderItemDescription?: string | null;
  createdByName?: string | null; purchasedByName?: string | null;
};
