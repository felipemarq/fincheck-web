import { IconFlame, IconMinus } from "@tabler/icons-react";
import { eachDayOfInterval, format, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { DailyCalorieEntry } from "@/app/entities/DailyCalorieEntry";

function formatKcal(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(Math.abs(value));
}

function balanceLabel(value: number | null) {
  if (value === null) return "Sem calculo";
  if (value > 0) return "Deficit " + formatKcal(value) + " kcal";
  if (value < 0) return "Superavit " + formatKcal(value) + " kcal";
  return "Equilibrio estimado";
}

export function CalorieWeek({
  entries,
  today,
  isLoading,
}: {
  entries: DailyCalorieEntry[];
  today: string;
  isLoading: boolean;
}) {
  const days = eachDayOfInterval({
    start: subDays(parseISO(today), 6),
    end: parseISO(today),
  }).map((date) => format(date, "yyyy-MM-dd"));
  const rows = days.map((day) => ({
    day,
    entry: entries.find((entry) => entry.loggedOn === day) ?? null,
  }));
  const maximum = Math.max(
    1,
    ...rows.flatMap(({ entry }) =>
      entry
        ? [
            entry.caloriesConsumed,
            entry.calculation.effectiveDailyExpenditureKcal ?? 0,
          ]
        : [0]
    )
  );

  if (isLoading && entries.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        Carregando calorias...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="mb-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-amber-400" />
          Consumo informado
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-sky-400" />
          Gasto diario usado
        </span>
      </div>

      {rows.map(({ day, entry }) => (
        <div
          key={day}
          className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[7.5rem_minmax(0,1fr)_10rem] sm:items-center"
        >
          <div>
            <p className="text-sm font-medium">
              {format(parseISO(day), "EEE, dd MMM", { locale: ptBR })}
            </p>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {day === today ? "Hoje" : "Registro diario"}
            </p>
          </div>

          {entry ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <IconFlame className="size-3.5 text-amber-300" />
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{
                      width:
                        Math.max(3, (entry.caloriesConsumed / maximum) * 100) +
                        "%",
                    }}
                  />
                </div>
                <span className="w-20 text-right text-xs tabular-nums">
                  {formatKcal(entry.caloriesConsumed)} kcal
                </span>
              </div>
              <div className="flex items-center gap-2">
                <IconMinus className="size-3.5 text-sky-300" />
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-sky-400"
                    style={{
                      width:
                        Math.max(
                          3,
                          ((entry.calculation.effectiveDailyExpenditureKcal ??
                            0) /
                            maximum) *
                            100
                        ) + "%",
                    }}
                  />
                </div>
                <span className="w-20 text-right text-xs tabular-nums">
                  {entry.calculation.effectiveDailyExpenditureKcal === null
                    ? "--"
                    : formatKcal(
                        entry.calculation.effectiveDailyExpenditureKcal
                      ) + " kcal"}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
              Sem calorias registradas. Este dia nao entra no deficit.
            </div>
          )}

          <div className="sm:text-right">
            <p
              className={
                "text-sm font-medium " +
                (entry?.balanceKcal === null || !entry
                  ? "text-muted-foreground"
                  : entry.balanceKcal >= 0
                    ? "text-emerald-300"
                    : "text-amber-300")
              }
            >
              {entry ? balanceLabel(entry.balanceKcal) : "Sem registro"}
            </p>
            {entry && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {entry.calculation.source === "OVERRIDE"
                  ? "Gasto manual"
                  : entry.calculation.source === "ESTIMATE"
                    ? "Gasto estimado"
                    : "Configure seu gasto"}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
