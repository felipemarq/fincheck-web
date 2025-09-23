import { Account } from "@/app/entities/Account";

export const ACCOUNT_TYPE_LABELS_PT: Record<Account.Type, string> = {
  [Account.Type.CHECKING]: "Conta corrente",
  [Account.Type.INVESTMENT]: "Investimentos",
  [Account.Type.CASH]: "Dinheiro físico",
} as const;
