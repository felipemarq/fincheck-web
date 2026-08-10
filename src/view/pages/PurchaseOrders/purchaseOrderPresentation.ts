import type {
  PurchaseOrderLifecycleStatus,
  PurchaseOrderItemProgress,
  PurchaseOrderProgress,
} from "@/app/entities/PurchaseOrder";

export const lifecycleLabels: Record<
  PurchaseOrderLifecycleStatus,
  string
> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativa",
  CANCELLED: "Cancelada",
};

export const progressLabels: Record<
  PurchaseOrderProgress | PurchaseOrderItemProgress,
  string
> = {
  DRAFT: "Rascunho",
  CANCELLED: "Cancelada",
  PENDING_PURCHASE: "Compra pendente",
  PARTIALLY_PURCHASED: "Compra parcial",
  PURCHASED: "Compra concluida",
  PURCHASED_AWAITING_ARRIVAL: "Comprado, aguardando chegada",
  PARTIALLY_RECEIVED: "Recebimento parcial",
  READY_FOR_DELIVERY: "Pronta para entrega",
  RECEIVED_AWAITING_DELIVERY: "Recebido, aguardando entrega",
  IN_DELIVERY: "Em entrega",
  PARTIALLY_DELIVERED: "Entrega parcial",
  DELIVERED: "Entregue",
};

export function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDate(value?: string) {
  if (!value) {
    return "Nao informado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(new Date(value));
}

export function lifecycleClass(status: PurchaseOrderLifecycleStatus) {
  if (status === "ACTIVE") {
    return "bg-emerald-500/10 text-emerald-400";
  }

  if (status === "CANCELLED") {
    return "bg-red-500/10 text-red-300";
  }

  return "bg-amber-500/10 text-amber-300";
}

export function progressClass(
  status: PurchaseOrderProgress | PurchaseOrderItemProgress
) {
  if (status === "CANCELLED") {
    return "bg-red-500/10 text-red-300";
  }

  if (
    status === "READY_FOR_DELIVERY" ||
    status === "RECEIVED_AWAITING_DELIVERY" ||
    status === "DELIVERED"
  ) {
    return "bg-emerald-500/10 text-emerald-300";
  }

  if (
    status === "PURCHASED" ||
    status === "PURCHASED_AWAITING_ARRIVAL" ||
    status === "PARTIALLY_RECEIVED"
  ) {
    return "bg-sky-500/10 text-sky-300";
  }

  if (status === "IN_DELIVERY" || status === "PARTIALLY_DELIVERED") {
    return "bg-cyan-500/10 text-cyan-300";
  }

  return "bg-amber-500/10 text-amber-300";
}
