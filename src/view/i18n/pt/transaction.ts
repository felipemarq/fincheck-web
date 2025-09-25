import { Transaction } from "@/app/entities/Transaction";

export const TRANSACTION_TYPE_LABELS_PT: Record<Transaction.Type, string> = {
  [Transaction.Type.INCOME]: "Receita",
  [Transaction.Type.EXPENSE]: "Despesa",
} as const;
