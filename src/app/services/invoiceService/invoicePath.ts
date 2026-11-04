export function invoicePath(entityId: string, purchaseOrderId?: string) {
  const scope = purchaseOrderId ? `/purchase-orders/${purchaseOrderId}` : "";
  return `/entities/${entityId}${scope}/invoices`;
}
