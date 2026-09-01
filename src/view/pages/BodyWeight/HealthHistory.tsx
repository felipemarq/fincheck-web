import {
  IconActivity,
  IconFlame,
  IconPencil,
  IconScale,
  IconTrash,
} from "@tabler/icons-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { BodyWeightEntry } from "@/app/entities/BodyWeightEntry";
import type { DailyCalorieEntry } from "@/app/entities/DailyCalorieEntry";
import { Button } from "@/components/ui/button";

function formatDate(value: string, long = false) {
  const pattern = long ? "EEEE, dd 'de' MMMM" : "dd/MM/yyyy";
  const label = format(parseISO(value), pattern, { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatWeight(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 3,
  }).format(value);
}

function formatKcal(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(Math.abs(value));
}

export function WeightHistory({
  entries,
  deleting,
  onEdit,
  onDelete,
}: {
  entries: BodyWeightEntry[];
  deleting: boolean;
  onEdit(entry: BodyWeightEntry): void;
  onDelete(entry: BodyWeightEntry): void;
}) {
  if (entries.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Nenhuma pesagem encontrada neste periodo.
      </div>
    );
  }

  const deltas = new Map<string, number | null>();
  entries.forEach((entry, index) => {
    const previous = entries[index - 1];
    deltas.set(entry.id, previous ? entry.weightKg - previous.weightKg : null);
  });

  return (
    <div className="divide-y">
      {[...entries].reverse().map((entry) => {
        const delta = deltas.get(entry.id) ?? null;
        const deltaLabel =
          delta === null
            ? "Primeiro registro do periodo"
            : (delta > 0 ? "+" : "") +
              formatWeight(delta) +
              " kg desde a medicao anterior";
        return (
          <div
            key={entry.id}
            className="flex flex-col gap-3 py-4 first:pt-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                <IconScale className="size-5" />
              </div>
              <div>
                <p className="font-medium">{formatDate(entry.measuredOn, true)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {deltaLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 pl-[3.25rem] sm:justify-end sm:pl-0">
              <p className="text-lg font-semibold tabular-nums">
                {formatWeight(entry.weightKg)} kg
              </p>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={"Editar pesagem de " + formatDate(entry.measuredOn)}
                  onClick={() => onEdit(entry)}
                >
                  <IconPencil />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={deleting}
                  aria-label={"Excluir pesagem de " + formatDate(entry.measuredOn)}
                  onClick={() => onDelete(entry)}
                >
                  <IconTrash />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CalorieHistory({
  entries,
  deleting,
  onEdit,
  onDelete,
}: {
  entries: DailyCalorieEntry[];
  deleting: boolean;
  onEdit(entry: DailyCalorieEntry): void;
  onDelete(entry: DailyCalorieEntry): void;
}) {
  if (entries.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Nenhuma caloria registrada ainda.
      </div>
    );
  }

  return (
    <div className="divide-y">
      {[...entries].reverse().map((entry) => {
        const balance = entry.balanceKcal;
        const balanceLabel =
          balance === null
            ? "Sem gasto configurado"
            : balance >= 0
              ? "Deficit de " + formatKcal(balance) + " kcal"
              : "Superavit de " + formatKcal(balance) + " kcal";
        const burnedSourceLabel =
          entry.caloriesBurnedSource === "DAILY"
            ? "informado no dia"
            : entry.caloriesBurnedSource === "PROFILE_OVERRIDE"
              ? "fallback manual"
              : entry.caloriesBurnedSource === "ESTIMATE"
                ? "fallback estimado"
                : "nao informado";
        return (
          <div
            key={entry.id}
            className="flex flex-col gap-3 py-4 first:pt-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
                <IconFlame className="size-5" />
              </div>
              <div>
                <p className="font-medium">{formatDate(entry.loggedOn, true)}</p>
                <p
                  className={
                    "mt-0.5 text-xs " +
                    (balance === null
                      ? "text-muted-foreground"
                      : balance >= 0
                        ? "text-emerald-300"
                        : "text-amber-300")
                  }
                >
                  {balanceLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 pl-[3.25rem] sm:justify-end sm:pl-0">
              <div className="space-y-1 text-right tabular-nums">
                <p className="flex items-center justify-end gap-1.5 text-sm font-medium">
                  <IconFlame className="size-3.5 text-amber-300" />
                  Consumido {formatKcal(entry.caloriesConsumed)} kcal
                </p>
                <p className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                  <IconActivity className="size-3.5 text-sky-300" />
                  Gasto {entry.effectiveCaloriesBurned === null
                    ? "--"
                    : formatKcal(entry.effectiveCaloriesBurned) + " kcal"}
                  {` (${burnedSourceLabel})`}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={"Editar calorias de " + formatDate(entry.loggedOn)}
                  onClick={() => onEdit(entry)}
                >
                  <IconPencil />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={deleting}
                  aria-label={"Excluir calorias de " + formatDate(entry.loggedOn)}
                  onClick={() => onDelete(entry)}
                >
                  <IconTrash />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
