// services/transactionsService/list.ts

import type { Transaction } from "@/app/entities/Transaction";
import { httpClient } from "../httpClient";
import type { Account } from "@/app/entities/Account";
import type { Category } from "@/app/entities/Category";

// ============= filtros =================
export type TransactionType = Transaction.Type;

export type ListTransactionsParams = {
  entityId: string;

  accountId?: string[];
  categoryId?: string[];
  type?: TransactionType[];

  isPaid?: boolean;

  startDate?: string | Date;
  endDate?: string | Date;
  dueDateStart?: string | Date;
  dueDateEnd?: string | Date;

  minValue?: number;
  maxValue?: number;

  sortBy?: "date" | "dueDate" | "createdAt" | "value" | "name";
  sortDir?: "asc" | "desc";
  page?: number; // 1-based
  pageSize?: number; // 1..100

  search?: string;
};

// ============= DTO usando seus tipos =================
// O item é a transação "pura" + refs aninhadas (apenas os campos necessários)
export type TransactionWithRefsDTO = Transaction.Attributes & {
  account: Pick<Account.Attributes, "id" | "name" | "color" | "type"> | null;
  category: Pick<Category.Attributes, "id" | "name" | "icon" | "type"> | null;
};

export interface ListTransactionsResponse {
  items: TransactionWithRefsDTO[];
  total: number;
  page?: string; // seu backend manda string
  pageSize: number;
  hasNext: boolean;
}

// ============= helpers =============
function toCsv(v?: string[]) {
  return v && v.length ? v.join(",") : undefined;
}
function toISO(d?: string | Date) {
  if (!d) return undefined;
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString();
}

// ============= chamada =============
export async function getAll(params: ListTransactionsParams) {
  const query = new URLSearchParams();

  query.set("entityId", params.entityId);

  if (params.accountId?.length)
    query.set("accountId", toCsv(params.accountId)!);
  if (params.categoryId?.length)
    query.set("categoryId", toCsv(params.categoryId)!);
  if (params.type?.length) query.set("type", toCsv(params.type as string[])!);

  if (typeof params.isPaid === "boolean")
    query.set("isPaid", String(params.isPaid));

  if (params.startDate) query.set("startDate", toISO(params.startDate)!);
  if (params.endDate) query.set("endDate", toISO(params.endDate)!);
  if (params.dueDateStart)
    query.set("dueDateStart", toISO(params.dueDateStart)!);
  if (params.dueDateEnd) query.set("dueDateEnd", toISO(params.dueDateEnd)!);

  if (typeof params.minValue === "number")
    query.set("minValue", String(params.minValue));
  if (typeof params.maxValue === "number")
    query.set("maxValue", String(params.maxValue));

  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortDir) query.set("sortDir", params.sortDir);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  if (params.search) query.set("search", params.search);

  const { data } = await httpClient.get<ListTransactionsResponse>(
    `/transactions?${query.toString()}`
  );
  return data;
}
