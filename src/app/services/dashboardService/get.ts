// src/services/dashboard/getDashboard.ts
import type { Account } from "@/app/entities/Account";
import { httpClient } from "../httpClient";

/** ===== Tipos auxiliares ===== */
export type Basis = "competence" | "cash";
export type Range = "this-month" | "last-30d" | "custom";
export type Trend = "up" | "down" | "flat";

/** ===== Request (query params) ===== */
export type DashboardSection =
  | "balances"
  | "cashflow"
  | "topCategories"
  | "due"
  | "tax";

export interface GetDashboardParams {
  entityId: string;
  range?: Range; // default: "this-month"
  from?: Date | string; // usado quando range = "custom"
  to?: Date | string; // usado quando range = "custom"
  sections?: DashboardSection[]; // vazio = todas as seções
  topN?: number; // default: 5
  basis?: Basis; // default: "cash"
}

/** ===== Response ===== */
export interface DashboardBalance {
  accountId?: string;
  name: string;
  type: Account.Type;
  color?: string;
  balance: number;
}

export interface DashboardCashflowPoint {
  date: string; // "YYYY-MM-DD" (UTC)
  income: number;
  expense: number;
  net: number; // income - expense
  cum: number; // acumulado
}

export interface DashboardCashflow {
  series: DashboardCashflowPoint[];
  totals: {
    income: number;
    expense: number;
    net: number; // income - expense
  };
}

export interface DashboardTopCategory {
  categoryId: string;
  name: string;
  icon: string;
  amount: number; // total no período
}

export interface DashboardDueItem {
  id: string;
  name: string;
  dueDate: string; // ISO
  value: number;
}

export interface DashboardTax {
  month: string; // "YYYY-MM"
  income: number; // receitas (competência) no mês
  ratePercent: number | null; // alíquota configurada ou null
  estimatedTax: number; // income * rate
  missingRate: boolean; // true => pedir configuração
}

export interface Delta {
  current: number;
  prev: number;
  delta: number;
  deltaPct: number | null; // null quando prev = 0
  trend: Trend; // "up" | "down" | "flat"
}

export interface DashboardInsights {
  cashflow?: {
    income: Delta;
    expense: Delta;
    net: Delta;
  };
  tax?: {
    estimated: Delta;
    month: string | null;
    prevMonth: string | null;
    missingRate: boolean;
  };
}

export interface DashboardResponse {
  range: { from: string; to: string }; // ISO
  previousRange?: { from: string; to: string }; // ISO
  generatedAt: string; // ISO
  balances?: DashboardBalance[];
  cashflow?: DashboardCashflow;
  topCategories?: DashboardTopCategory[];
  due?: DashboardDueItem[];
  tax?: DashboardTax;
  insights?: DashboardInsights;
}

/** ===== Fetch function ===== */
export const get = async (params: GetDashboardParams) => {
  const {
    entityId,
    range = "this-month",
    from,
    to,
    sections,
    topN = 5,
    basis = "cash",
  } = params;

  // o backend espera `sections` como CSV (string)
  const sectionsCsv =
    sections && sections.length ? sections.join(",") : undefined;

  const query = {
    entityId,
    range,
    from: from instanceof Date ? from.toISOString() : from,
    to: to instanceof Date ? to.toISOString() : to,
    sections: sectionsCsv,
    topN,
    basis,
  };

  const { data } = await httpClient.get<DashboardResponse>("/dashboard", {
    params: query,
  });

  return data;
};
