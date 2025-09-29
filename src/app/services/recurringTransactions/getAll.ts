// app/services/recurringTransactionsService/getAll.ts
import { httpClient } from "../httpClient";

export type Recurrence = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type TransactionType = "INCOME" | "EXPENSE";

export type ListRecurringTransactionsParams = {
  entityId: string;
  accountId?: string[];
  categoryId?: string[];
  type?: TransactionType[];
  // datas do período da REGRA (não é due)
  startDate?: string; // ISO
  endDate?: string;   // ISO
  // valor (no back é >=)
  value?: number;
  recurrence?: Recurrence[]; // aceita CSV
  // ordenação/paginação
  sortBy?: "startDate" | "endDate" | "createdAt" | "value" | "name";
  sortDir?: "asc" | "desc";
  page?: number; // 1-based
  pageSize?: number;
  search?: string;
  name?: string;
};

export interface RecurringTransactionDTO {
  id: string;
  entityId: string;
  userId: string;
  accountId: string;
  categoryId: string;
  creditCardId?: string | null;
  contactId?: string | null;
  name: string;
  value: number;
  type: TransactionType;
  startDate: string;      // ISO
  endDate?: string | null;// ISO | null
  recurrence: Recurrence;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListRecurringTransactionsResponse {
  items: RecurringTransactionDTO[];
  total: number;
  page?: string;  // backend manda string
  pageSize: number;
  hasNext: boolean;
}

function toCsv(v?: string[] | (string | number)[]) {
  return v && v.length ? v.join(",") : undefined;
}
function toISO(d?: string | Date) {
  if (!d) return undefined;
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString();
}

export async function getAll(params: ListRecurringTransactionsParams) {
  const q = new URLSearchParams();
  q.set("entityId", params.entityId);

  if (params.accountId?.length) q.set("accountId", toCsv(params.accountId)!);
  if (params.categoryId?.length) q.set("categoryId", toCsv(params.categoryId)!);
  if (params.type?.length) q.set("type", toCsv(params.type as string[])!);
  if (params.recurrence?.length) q.set("recurrence", toCsv(params.recurrence)!);

  if (params.startDate) q.set("startDate", toISO(params.startDate)!);
  if (params.endDate) q.set("endDate", toISO(params.endDate)!);

  if (typeof params.value === "number") q.set("value", String(params.value));

  if (params.sortBy) q.set("sortBy", params.sortBy);
  if (params.sortDir) q.set("sortDir", params.sortDir);
  if (params.page) q.set("page", String(params.page));
  if (params.pageSize) q.set("pageSize", String(params.pageSize));
  if (params.search) q.set("search", params.search);
  if (params.name) q.set("name", params.name);

  const { data } = await httpClient.get<ListRecurringTransactionsResponse>(
    `/recurring-transactions?${q.toString()}`
  );
  return data;
}


