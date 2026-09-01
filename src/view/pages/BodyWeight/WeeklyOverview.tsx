import {
  IconActivity,
  IconCalendar,
  IconFlame,
  IconScale,
  IconTargetArrow,
} from "@tabler/icons-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { GoalProjection, WeeklyHealthSummary } from "./analytics";

function formatWeight(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatKcal(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(Math.abs(value));
}

function formatBalance(value: number | null) {
  if (value === null) return "Sem calculo";
  if (value >= 0) return `Deficit ${formatKcal(value)}`;
  return `Superavit ${formatKcal(value)}`;
}

export function WeeklyOverview({
  summary,
  projection,
}: {
  summary: WeeklyHealthSummary;
  projection: GoalProjection;
}) {
  const period = `${format(parseISO(summary.from), "dd MMM", {
    locale: ptBR,
  })} a ${format(parseISO(summary.to), "dd MMM", { locale: ptBR })}`;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-white/[0.015]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Leitura automatica
            </p>
            <CardTitle className="mt-2">Resumo da semana</CardTitle>
          </div>
          <span className="w-fit rounded-full border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
            {period}
          </span>
        </div>
      </CardHeader>

      <CardContent className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(17rem,0.8fr)]">
        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryItem
            icon={<IconScale className="size-4" />}
            label="Peso medio"
            value={
              summary.averageWeightKg === null
                ? "--"
                : `${formatWeight(summary.averageWeightKg)} kg`
            }
            helper={`${summary.weightEntries}/7 dias com pesagem`}
            tone="sky"
          />
          <SummaryItem
            icon={<IconFlame className="size-4" />}
            label="Media consumida"
            value={
              summary.averageConsumedKcal === null
                ? "--"
                : `${formatKcal(summary.averageConsumedKcal)} kcal`
            }
            helper={`${summary.calorieDays}/7 dias registrados`}
            tone="amber"
          />
          <SummaryItem
            icon={<IconActivity className="size-4" />}
            label="Media gasta"
            value={
              summary.averageBurnedKcal === null
                ? "--"
                : `${formatKcal(summary.averageBurnedKcal)} kcal`
            }
            helper={`${summary.calculableDays}/7 dias com gasto`}
            tone="sky"
          />
          <SummaryItem
            icon={<IconCalendar className="size-4" />}
            label="Balanco acumulado"
            value={formatBalance(summary.totalBalanceKcal)}
            helper={`${summary.calculableDays} dias com gasto calculado`}
            tone={
              summary.totalBalanceKcal !== null &&
              summary.totalBalanceKcal < 0
                ? "amber"
                : "emerald"
            }
          />
        </div>

        <ProjectionPanel projection={projection} />
      </CardContent>
    </Card>
  );
}

function ProjectionPanel({ projection }: { projection: GoalProjection }) {
  const details = projectionDetails(projection);

  return (
    <div className="relative overflow-hidden rounded-xl border border-emerald-400/15 bg-[radial-gradient(circle_at_100%_0%,rgba(16,185,129,0.14),transparent_45%),rgba(16,185,129,0.035)] p-4">
      <div className="flex items-center gap-2 text-emerald-300">
        <IconTargetArrow className="size-5" />
        <p className="text-xs font-semibold uppercase tracking-[0.16em]">
          Projecao da meta
        </p>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight">
        {details.value}
      </p>
      <p className="mt-2 text-sm leading-5 text-muted-foreground">
        {details.description}
      </p>

      {projection.status === "PROJECTED" && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border bg-background/50 px-2.5 py-1">
            Ritmo {projection.weeklyRateKg! > 0 ? "+" : ""}
            {formatWeight(projection.weeklyRateKg!)} kg/sem
          </span>
          {projection.targetDateStatus && (
            <span
              className={cn(
                "rounded-full border px-2.5 py-1",
                projection.targetDateStatus === "ON_TRACK"
                  ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-400/20 bg-amber-500/10 text-amber-300"
              )}
            >
              {projection.targetDateStatus === "ON_TRACK"
                ? "Dentro da data-alvo"
                : "Apos a data-alvo"}
            </span>
          )}
        </div>
      )}

      <p className="mt-4 text-[11px] leading-4 text-muted-foreground">
        Tendencia matematica baseada em {projection.sampleCount} registros de
        ate 6 semanas. Nao e uma previsao clinica.
      </p>
    </div>
  );
}

function projectionDetails(projection: GoalProjection) {
  switch (projection.status) {
    case "NO_GOAL":
      return {
        value: "Defina sua meta",
        description:
          "Informe um peso-alvo para acompanhar o ritmo e uma data estimada.",
      };
    case "GOAL_REACHED":
      return {
        value: "Meta alcancada",
        description: "Sua media movel esta dentro de 50 g do objetivo definido.",
      };
    case "NOT_TOWARD_GOAL":
      return {
        value: "Sem data confiavel",
        description:
          "A tendencia atual esta estavel, distante demais ou ainda nao segue na direcao da meta.",
      };
    case "PROJECTED":
      return {
        value: format(parseISO(projection.projectedDate!), "dd MMM yyyy", {
          locale: ptBR,
        }),
        description: `Estimativa mantendo o ritmo observado nos ultimos ${projection.sampleSpanDays} dias.`,
      };
    default:
      return {
        value: "Construindo tendencia",
        description:
          "Registre ao menos quatro pesagens distribuidas por 14 dias e mantenha uma medicao recente.",
      };
  }
}

function SummaryItem({
  icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
  tone: "sky" | "emerald" | "amber";
}) {
  const tones = {
    sky: "border-sky-400/15 bg-sky-500/[0.06] text-sky-300",
    emerald:
      "border-emerald-400/15 bg-emerald-500/[0.06] text-emerald-300",
    amber: "border-amber-400/15 bg-amber-500/[0.06] text-amber-300",
  };

  return (
    <div className="rounded-xl border bg-muted/10 p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-md border",
            tones[tone]
          )}
        >
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-3 text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}
