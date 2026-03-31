import { Link } from "react-router-dom";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardResponse } from "@/app/services/dashboardService/get";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/view/components/ui/card";

type SettlementCardsProps = {
  dashboard: DashboardResponse;
  isFetchingDashboard: boolean;
};

function formatMoney(value: number | undefined) {
  return (value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function SettlementCards({
  dashboard,
  isFetchingDashboard,
}: SettlementCardsProps) {
  const settlements = dashboard?.settlements;
  const loading = isFetchingDashboard && !dashboard;

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-2">
      <Card className="shadow-xs">
        <CardHeader>
          <CardDescription>Contas a pagar em aberto</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {loading ? "—" : formatMoney(settlements?.payables.openTotal)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="font-medium">
            {settlements?.payables.openCount ?? 0} contas aguardando pagamento
          </div>
          <div className="text-muted-foreground">
            Vencidas: {formatMoney(settlements?.payables.overdueTotal)} | Hoje:{" "}
            {formatMoney(settlements?.payables.dueTodayTotal)}
          </div>
          <div className="text-muted-foreground">
            Próximos {settlements?.horizonDays ?? 7} dias:{" "}
            {formatMoney(settlements?.payables.upcomingTotal)}
          </div>
          <Link
            to="/payables"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Ver contas a pagar
          </Link>
        </CardContent>
      </Card>

      <Card className="shadow-xs">
        <CardHeader>
          <CardDescription>Contas a receber em aberto</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {loading ? "—" : formatMoney(settlements?.receivables.openTotal)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="font-medium">
            {settlements?.receivables.openCount ?? 0} contas aguardando
            recebimento
          </div>
          <div className="text-muted-foreground">
            Vencidas: {formatMoney(settlements?.receivables.overdueTotal)} |
            Hoje: {formatMoney(settlements?.receivables.dueTodayTotal)}
          </div>
          <div className="text-muted-foreground">
            Próximos {settlements?.horizonDays ?? 7} dias:{" "}
            {formatMoney(settlements?.receivables.upcomingTotal)}
          </div>
          <Link
            to="/receivables"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Ver contas a receber
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
