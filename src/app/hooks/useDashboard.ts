// src/hooks/useDashboard.ts
import { useQuery } from "@tanstack/react-query";
import type {
  DashboardResponse,
  GetDashboardParams,
} from "../services/dashboardService/get";
import { QueryKeys } from "../config/QueryKeys";
import { dashboardService } from "../services/dashboardService";

// Deixa a queryKey estável (útil p/ cache & refetch controlado)
const buildDashboardKey = (p: GetDashboardParams) =>
  [
    QueryKeys.DASHBOARD,
    {
      entityId: p.entityId,
      range: p.range ?? "this-month",
      from: p.from instanceof Date ? p.from.toISOString() : p.from,
      to: p.to instanceof Date ? p.to.toISOString() : p.to,
      sections: (p.sections ?? []).slice().sort(), // evita cache duplicado por ordem diferente
      topN: p.topN ?? 5,
      basis: p.basis ?? "cash",
    },
  ] as const;

export const useDashboard = (
  params: GetDashboardParams,
  enabled: boolean = true
) => {
  const { data, isFetching, refetch, ...rest } = useQuery<DashboardResponse>({
    queryKey: buildDashboardKey(params),
    queryFn: () => dashboardService.get(params),
    enabled: enabled && Boolean(params?.entityId),
    staleTime: 5 * 60 * 1000, // 5min (ajuste como preferir)
  });

  return {
    dashboard: data,
    isFetchingDashboard: isFetching,
    refetchDashboard: refetch,
    ...rest,
  };
};
