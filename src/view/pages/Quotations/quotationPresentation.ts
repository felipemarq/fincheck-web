import type { QuotationStatus } from "@/app/entities/Quotation";

export const quotationStatusLabels = {
  DRAFT: "Rascunho",
  SENT: "Enviada",
  APPROVED: "Aprovada",
  REJECTED: "Recusada",
  CANCELLED: "Cancelada",
  EXPIRED: "Expirada",
} satisfies Record<QuotationStatus, string>;

export function quotationStatusClass(status: QuotationStatus) {
  if (status === "APPROVED") {
    return "bg-emerald-500/10 text-emerald-300";
  }

  if (status === "SENT") {
    return "bg-sky-500/10 text-sky-300";
  }

  if (status === "REJECTED" || status === "CANCELLED") {
    return "bg-red-500/10 text-red-300";
  }

  if (status === "EXPIRED") {
    return "bg-amber-500/10 text-amber-300";
  }

  return "bg-muted text-muted-foreground";
}

export function formatQuotationCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatQuotationDate(value?: string) {
  if (!value) return "Nao informado";

  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(value)
  );
}

export function formatQuotationQuantity(value: number) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}
