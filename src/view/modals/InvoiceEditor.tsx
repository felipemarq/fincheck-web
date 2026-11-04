import { useState } from "react";
import type { Invoice } from "@/app/entities/Invoice";
import { useAuth } from "@/app/hooks/useAuth";
import { usePurchaseOrder } from "@/app/hooks/usePurchaseOrder";
import { usePurchaseOrders } from "@/app/hooks/usePurchaseOrders";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InvoiceModal } from "./InvoiceModal";
import { StandaloneInvoiceModal } from "./StandaloneInvoiceModal";

/** Mounted per editing session so the selected OC and form never leak between notes. */
export function InvoiceEditor({
  invoice,
  onClose,
}: {
  invoice?: Invoice;
  onClose: () => void;
}) {
  const { selectedEntityId, can } = useAuth();
  const [orderId, setOrderId] = useState(invoice?.purchaseOrderId ?? "");
  const ordersQuery = usePurchaseOrders(
    { entityId: selectedEntityId ?? "", lifecycleStatus: "ACTIVE" },
    !invoice && can("orders.read"),
  );
  const orderQuery = usePurchaseOrder(
    { entityId: selectedEntityId ?? "", purchaseOrderId: orderId },
    Boolean(orderId),
  );
  if (orderId) {
    if (orderQuery.order)
      return (
        <InvoiceModal
          isOpen
          onClose={onClose}
          order={orderQuery.order}
          invoice={invoice}
        />
      );
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {orderQuery.isError
                ? "Não foi possível carregar a OC"
                : "Carregando ordem de compra…"}
            </DialogTitle>
            <DialogDescription>
              A nota utilizará o cliente e os itens da ordem selecionada.
            </DialogDescription>
          </DialogHeader>
          {orderQuery.isError && (
            <Button onClick={() => orderQuery.refetch()}>
              Tentar novamente
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <StandaloneInvoiceModal
      invoice={invoice}
      onClose={onClose}
      orderChoice={
        !invoice && can("orders.read") ? (
          <div className="space-y-2 rounded-xl border p-4">
            <Label>Ordem de compra (opcional)</Label>
            <Select
              value="none"
              onValueChange={(value) =>
                setOrderId(value === "none" ? "" : value)
              }
            >
              <SelectTrigger
                className="w-full"
                aria-label="Ordem de compra opcional"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem ordem de compra</SelectItem>
                {ordersQuery.orders?.map((order) => (
                  <SelectItem key={order.id} value={order.id}>
                    OC {order.orderNumber} —{" "}
                    {order.customer.tradeName || order.customer.legalName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Selecione uma OC para faturar seus itens, ou preencha os itens
              livremente abaixo.
            </p>
            {ordersQuery.isError && (
              <Button variant="link" onClick={() => ordersQuery.refetch()}>
                Recarregar ordens
              </Button>
            )}
          </div>
        ) : undefined
      }
    />
  );
}
