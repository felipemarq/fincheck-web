// src/view/modules/dashboard/SectionCards.tsx
import {
  IconTrendingDown,
  IconTrendingUp,
  IconMinus,
} from "@tabler/icons-react";
import { Badge } from "@/view/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/view/components/ui/card";
import type {
  Basis,
  DashboardResponse,
  Delta,
} from "@/app/services/dashboardService/get";

type SectionCardsProps = {
  dashboard: DashboardResponse;
  basis?: Basis;
  isFetchingDashboard: boolean;
};

const fmtBRL = (n: number | undefined) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function DeltaBadge({ delta }: { delta?: Delta }) {
  if (!delta) {
    return (
      <Badge variant="outline">
        <IconMinus className="mr-1 h-4 w-4" />
        —%
      </Badge>
    );
  }
  const pct =
    delta.deltaPct == null
      ? "—%"
      : `${delta.deltaPct > 0 ? "+" : ""}${delta.deltaPct}%`;

  const Icon =
    delta.trend === "up"
      ? IconTrendingUp
      : delta.trend === "down"
      ? IconTrendingDown
      : IconMinus;

  const color =
    delta.trend === "up"
      ? "text-emerald-600 border-emerald-600"
      : delta.trend === "down"
      ? "text-rose-600 border-rose-600"
      : "text-muted-foreground";

  return (
    <Badge variant="outline" className={color}>
      <Icon className="mr-1 h-4 w-4" />
      {pct}
    </Badge>
  );
}

export function SectionCards({
  dashboard,
  isFetchingDashboard,
  basis = "cash",
}: SectionCardsProps) {
  const totals = dashboard?.cashflow?.totals;
  const insights = dashboard?.insights?.cashflow;
  const tax = dashboard?.tax;
  const taxInsight = dashboard?.insights?.tax?.estimated;

  const prevLabel = dashboard?.previousRange
    ? new Date(dashboard.previousRange.from).toLocaleDateString("pt-BR", {
        timeZone: "UTC",
      }) +
      " – " +
      new Date(dashboard.previousRange.to).toLocaleDateString("pt-BR", {
        timeZone: "UTC",
      })
    : "período anterior";

  // loaders simples (pode trocar por Skeleton do seu design system)
  const loading = isFetchingDashboard && !dashboard;

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {/* Receitas */}
      <Card className="@container/card data-[slot=card]:bg-gradient-to-t data-[slot=card]:from-primary/5 data-[slot=card]:to-card shadow-xs">
        <CardHeader>
          <CardDescription>
            Receitas ({basis === "cash" ? "Caixa" : "Competência"})
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? "—" : fmtBRL(totals?.income)}
          </CardTitle>
          <CardAction>
            <DeltaBadge delta={insights?.income} />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {insights?.income?.trend === "up"
              ? "Subiu neste período"
              : insights?.income?.trend === "down"
              ? "Caiu neste período"
              : "Estável neste período"}
          </div>
          <div className="text-muted-foreground">Comparado a {prevLabel}</div>
        </CardFooter>
      </Card>

      {/* Despesas */}
      <Card className="@container/card data-[slot=card]:bg-gradient-to-t data-[slot=card]:from-primary/5 data-[slot=card]:to-card shadow-xs">
        <CardHeader>
          <CardDescription>
            Despesas ({basis === "cash" ? "Caixa" : "Competência"})
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? "—" : fmtBRL(totals?.expense)}
          </CardTitle>
          <CardAction>
            <DeltaBadge delta={insights?.expense} />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {insights?.expense?.trend === "up"
              ? "Aumentaram"
              : insights?.expense?.trend === "down"
              ? "Diminuíram"
              : "Estáveis"}
          </div>
          <div className="text-muted-foreground">Comparado a {prevLabel}</div>
        </CardFooter>
      </Card>

      {/* Resultado (Net) */}
      <Card className="@container/card data-[slot=card]:bg-gradient-to-t data-[slot=card]:from-primary/5 data-[slot=card]:to-card shadow-xs">
        <CardHeader>
          <CardDescription>Resultado (Net)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? "—" : fmtBRL(totals?.net)}
          </CardTitle>
          <CardAction>
            <DeltaBadge delta={insights?.net} />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {insights?.net?.trend === "up"
              ? "Resultado melhor"
              : insights?.net?.trend === "down"
              ? "Resultado pior"
              : "Resultado estável"}
          </div>
          <div className="text-muted-foreground">Comparado a {prevLabel}</div>
        </CardFooter>
      </Card>

      {/* Imposto estimado (competência do mês) */}
      <Card className="@container/card data-[slot=card]:bg-gradient-to-t data-[slot=card]:from-primary/5 data-[slot=card]:to-card shadow-xs">
        <CardHeader>
          <CardDescription>
            Imposto estimado ({tax?.month ?? "—"})
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? "—" : fmtBRL(tax?.estimatedTax)}
          </CardTitle>
          <CardAction>
            <DeltaBadge delta={taxInsight} />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {tax?.missingRate
              ? "Configure a alíquota do mês"
              : taxInsight?.trend === "up"
              ? "Tributo maior que no mês anterior"
              : taxInsight?.trend === "down"
              ? "Tributo menor que no mês anterior"
              : "Sem variação"}
          </div>
          <div className="text-muted-foreground">
            Comparado a {dashboard?.insights?.tax?.prevMonth ?? "mês anterior"}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
