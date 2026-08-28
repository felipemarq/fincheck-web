import {
  IconCalendar,
  IconChartLine,
  IconCheck,
  IconHistory,
  IconLock,
  IconPencil,
  IconRefresh,
  IconScale,
  IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { NumericFormat } from "react-number-format";
import { toast } from "sonner";

import { QueryKeys } from "@/app/config/QueryKeys";
import type { BodyWeightEntry } from "@/app/entities/BodyWeightEntry";
import { useBodyWeights } from "@/app/hooks/useBodyWeights";
import { bodyWeightService } from "@/app/services/bodyWeightService";
import { treatAxiosError } from "@/app/utils/treatAxiosError";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type WeightRange = "30" | "90" | "365" | "all";

const rangeOptions: Array<{ value: WeightRange; label: string }> = [
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
  { value: "365", label: "1 ano" },
  { value: "all", label: "Tudo" },
];

function formatWeight(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 3,
  }).format(value);
}

function formatEntryDate(value: string, long = false) {
  const pattern = long ? "EEEE, dd 'de' MMMM" : "dd/MM/yyyy";
  const label = format(parseISO(value), pattern, { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatDelta(value: number | null) {
  if (value === null) return "Sem base";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatWeight(value)} kg`;
}

function getDeltaSinceDays(entries: BodyWeightEntry[], days: number) {
  const latest = entries.at(-1);
  if (!latest) return null;

  const target = format(subDays(parseISO(latest.measuredOn), days), "yyyy-MM-dd");
  const baseline = entries.filter((entry) => entry.measuredOn <= target).at(-1);
  return baseline ? latest.weightKg - baseline.weightKg : null;
}

export default function BodyWeight() {
  const today = format(new Date(), "yyyy-MM-dd");
  const queryClient = useQueryClient();
  const [range, setRange] = useState<WeightRange>("30");
  const [measuredOn, setMeasuredOn] = useState(today);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [editingDate, setEditingDate] = useState<string | null>(null);

  const queryParams =
    range === "all"
      ? { to: today }
      : {
          from: format(subDays(new Date(), Number(range) - 1), "yyyy-MM-dd"),
          to: today,
        };
  const { data: entries = [], isFetching, isError, refetch } =
    useBodyWeights(queryParams);
  const upsertMutation = useMutation({ mutationFn: bodyWeightService.upsert });
  const deleteMutation = useMutation({ mutationFn: bodyWeightService.remove });

  const latestEntry = entries.at(-1);
  const firstEntry = entries.at(0);
  const periodDelta =
    latestEntry && firstEntry && latestEntry.id !== firstEntry.id
      ? latestEntry.weightKg - firstEntry.weightKg
      : null;
  const sevenDayDelta = getDeltaSinceDays(entries, 7);

  const resetForm = () => {
    setMeasuredOn(today);
    setWeightKg(null);
    setEditingDate(null);
  };

  const saveEntry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!weightKg || weightKg < 20 || weightKg > 500) {
      toast.error("Informe um peso entre 20 e 500 kg.");
      return;
    }

    try {
      await upsertMutation.mutateAsync({ measuredOn, weightKg });
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.BODY_WEIGHTS],
      });
      toast.success(editingDate ? "Pesagem atualizada." : "Pesagem registrada.");
      resetForm();
    } catch (error) {
      treatAxiosError(error);
    }
  };

  const editEntry = (entry: BodyWeightEntry) => {
    setMeasuredOn(entry.measuredOn);
    setWeightKg(entry.weightKg);
    setEditingDate(entry.measuredOn);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteEntry = async (entry: BodyWeightEntry) => {
    const confirmed = window.confirm(
      `Excluir a pesagem de ${formatEntryDate(entry.measuredOn)}?`
    );
    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(entry.measuredOn);
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.BODY_WEIGHTS],
      });
      if (editingDate === entry.measuredOn) resetForm();
      toast.success("Pesagem excluida.");
    } catch (error) {
      treatAxiosError(error);
    }
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-5 lg:px-6 lg:py-7">
      <section className="relative overflow-hidden rounded-2xl border bg-[radial-gradient(circle_at_88%_10%,rgba(14,165,233,0.18),transparent_35%),radial-gradient(circle_at_12%_100%,rgba(16,185,129,0.16),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent)] p-5 sm:p-7">
        <div className="absolute -right-14 -top-20 size-64 rounded-full border border-sky-300/10" />
        <div className="absolute right-14 top-8 hidden size-28 rounded-full border border-emerald-300/10 sm:block" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="flex size-11 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-500/10 text-sky-300">
              <IconScale className="size-6" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
              Espaco pessoal
            </p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Evolucao de peso
            </h2>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              Registre sua pesagem diaria e acompanhe a tendencia com calma,
              consistencia e contexto.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 lg:self-auto">
            <IconLock className="size-4" />
            Visivel somente para voce
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(18rem,0.68fr)_minmax(0,1.55fr)]">
        <Card className="overflow-hidden xl:sticky xl:top-6">
          <div className="h-1 bg-gradient-to-r from-sky-400 via-emerald-400 to-lime-300" />
          <CardHeader className="pt-1">
            <CardTitle>
              {editingDate ? "Editar pesagem" : "Registrar pesagem"}
            </CardTitle>
            <CardDescription>
              Uma data possui apenas um registro. Salvar novamente atualiza o
              valor existente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={saveEntry}>
              <div className="space-y-2">
                <Label htmlFor="weight-date">Data da medicao</Label>
                <Input
                  id="weight-date"
                  type="date"
                  max={today}
                  value={measuredOn}
                  onChange={(event) => setMeasuredOn(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight-value">Peso</Label>
                <NumericFormat
                  id="weight-value"
                  customInput={Input}
                  value={weightKg ?? ""}
                  decimalScale={3}
                  decimalSeparator=","
                  thousandSeparator="."
                  suffix=" kg"
                  allowNegative={false}
                  inputMode="decimal"
                  placeholder="Ex.: 82,4 kg"
                  onValueChange={({ floatValue }) =>
                    setWeightKg(floatValue ?? null)
                  }
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  Voce pode informar ate tres casas decimais.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                isLoading={upsertMutation.isPending}
              >
                <IconCheck />
                {editingDate ? "Salvar alteracao" : "Registrar peso"}
              </Button>

              {editingDate && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={resetForm}
                >
                  Cancelar edicao
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Peso atual"
              value={latestEntry ? `${formatWeight(latestEntry.weightKg)} kg` : "--"}
              helper={
                latestEntry
                  ? formatEntryDate(latestEntry.measuredOn)
                  : "Nenhuma pesagem"
              }
              icon={<IconScale className="size-5" />}
              tone="sky"
            />
            <MetricCard
              label="Variacao em 7 dias"
              value={formatDelta(sevenDayDelta)}
              helper="Comparada ao registro-base"
              icon={<IconChartLine className="size-5" />}
              tone="emerald"
            />
            <MetricCard
              label="Variacao no periodo"
              value={formatDelta(periodDelta)}
              helper={range === "all" ? "Desde o primeiro registro" : `Ultimos ${range} dias`}
              icon={<IconCalendar className="size-5" />}
              tone="amber"
            />
            <MetricCard
              label="Registros"
              value={String(entries.length)}
              helper="No periodo selecionado"
              icon={<IconHistory className="size-5" />}
              tone="slate"
            />
          </section>

          <Card className="overflow-hidden">
            <CardHeader className="gap-4 border-b">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Tendencia</CardTitle>
                  <CardDescription className="mt-1">
                    A linha conecta suas pesagens no periodo escolhido.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2" aria-label="Periodo do grafico">
                  {rangeOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant={range === option.value ? "secondary" : "ghost"}
                      className={cn(
                        range === option.value &&
                          "border border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                      )}
                      onClick={() => setRange(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {isError ? (
                <ErrorState onRetry={() => refetch()} />
              ) : (
                <WeightChart entries={entries} isLoading={isFetching} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Historico</CardTitle>
              <CardDescription>
                Edite uma medicao incorreta ou remova um registro quando
                necessario.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 sm:pt-3">
              <WeightHistory
                entries={entries}
                deleting={deleteMutation.isPending}
                onEdit={editEntry}
                onDelete={deleteEntry}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  tone: "sky" | "emerald" | "amber" | "slate";
}) {
  const tones = {
    sky: "border-sky-400/20 bg-sky-500/10 text-sky-300",
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-300",
    slate: "border-white/10 bg-white/5 text-slate-300",
  };

  return (
    <Card className="gap-3 p-4">
      <div className={cn("flex size-9 items-center justify-center rounded-lg border", tones[tone])}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      </div>
    </Card>
  );
}

function WeightChart({
  entries,
  isLoading,
}: {
  entries: BodyWeightEntry[];
  isLoading: boolean;
}) {
  if (isLoading && entries.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
        Carregando sua evolucao...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/10 px-5 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-sky-500/10 text-sky-300">
          <IconChartLine className="size-6" />
        </div>
        <p className="mt-4 font-medium">Seu grafico comeca no primeiro registro</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Cadastre a pesagem de hoje para iniciar o acompanhamento.
        </p>
      </div>
    );
  }

  const width = 860;
  const height = 290;
  const padding = { top: 24, right: 28, bottom: 42, left: 54 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const weights = entries.map((entry) => entry.weightKg);
  const rawMin = Math.min(...weights);
  const rawMax = Math.max(...weights);
  const spread = Math.max(rawMax - rawMin, 1);
  const min = rawMin - spread * 0.18;
  const max = rawMax + spread * 0.18;
  const points = entries.map((entry, index) => {
    const x =
      entries.length === 1
        ? padding.left + chartWidth / 2
        : padding.left + (index / (entries.length - 1)) * chartWidth;
    const y = padding.top + ((max - entry.weightKg) / (max - min)) * chartHeight;
    return { x, y, entry };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `M ${points[0].x} ${padding.top + chartHeight} L ${points
    .map((point) => `${point.x} ${point.y}`)
    .join(" L ")} L ${points.at(-1)!.x} ${padding.top + chartHeight} Z`;
  const labelIndexes = [...new Set([0, Math.floor((entries.length - 1) / 2), entries.length - 1])];

  return (
    <div className="relative overflow-x-auto" aria-label="Grafico da evolucao do peso">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-h-64 w-full min-w-[36rem]" role="img">
        <defs>
          <linearGradient id="weight-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
          <filter id="weight-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {[0, 0.5, 1].map((ratio) => {
          const y = padding.top + ratio * chartHeight;
          const value = max - ratio * (max - min);
          return (
            <g key={ratio}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="currentColor" className="text-border" strokeDasharray="5 7" />
              <text x={padding.left - 10} y={y + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">
                {formatWeight(value)}
              </text>
            </g>
          );
        })}

        <path d={area} fill="url(#weight-area)" />
        <polyline points={line} fill="none" stroke="#34d399" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" filter="url(#weight-glow)" />

        {points.map((point, index) => (
          <circle
            key={point.entry.id}
            cx={point.x}
            cy={point.y}
            r={index === points.length - 1 ? 5 : 3.5}
            fill={index === points.length - 1 ? "#7dd3fc" : "#34d399"}
            stroke="#111827"
            strokeWidth="2"
          />
        ))}

        {labelIndexes.map((index) => {
          const point = points[index];
          return (
            <text key={point.entry.id} x={point.x} y={height - 13} textAnchor={index === 0 ? "start" : index === entries.length - 1 ? "end" : "middle"} className="fill-muted-foreground text-[11px]">
              {format(parseISO(point.entry.measuredOn), "dd MMM", { locale: ptBR })}
            </text>
          );
        })}
      </svg>
      {isLoading && (
        <span className="absolute right-2 top-2 rounded-full bg-background/80 px-2 py-1 text-xs text-muted-foreground">
          Atualizando...
        </span>
      )}
    </div>
  );
}

function WeightHistory({
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
        return (
          <div key={entry.id} className="flex flex-col gap-3 py-4 first:pt-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                <IconScale className="size-5" />
              </div>
              <div>
                <p className="font-medium">{formatEntryDate(entry.measuredOn, true)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {delta === null ? "Primeiro registro do periodo" : `${formatDelta(delta)} desde a medicao anterior`}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 pl-[3.25rem] sm:justify-end sm:pl-0">
              <p className="text-lg font-semibold tabular-nums">{formatWeight(entry.weightKg)} kg</p>
              <div className="flex gap-1">
                <Button type="button" size="icon" variant="ghost" aria-label={`Editar pesagem de ${formatEntryDate(entry.measuredOn)}`} onClick={() => onEdit(entry)}>
                  <IconPencil />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="text-destructive hover:text-destructive" disabled={deleting} aria-label={`Excluir pesagem de ${formatEntryDate(entry.measuredOn)}`} onClick={() => onDelete(entry)}>
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

function ErrorState({ onRetry }: { onRetry(): void }) {
  return (
    <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed px-5 text-center">
      <p className="font-medium">Nao foi possivel carregar suas pesagens.</p>
      <p className="mt-1 text-sm text-muted-foreground">Tente novamente em instantes.</p>
      <Button type="button" variant="outline" className="mt-4" onClick={onRetry}>
        <IconRefresh />
        Tentar novamente
      </Button>
    </div>
  );
}
