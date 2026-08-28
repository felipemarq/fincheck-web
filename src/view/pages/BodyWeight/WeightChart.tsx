import { IconChartLine } from "@tabler/icons-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { MovingAveragePoint } from "./analytics";

function formatWeight(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value);
}

export function WeightChart({
  entries,
  isLoading,
}: {
  entries: MovingAveragePoint[];
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
  const height = 300;
  const padding = { top: 30, right: 28, bottom: 42, left: 54 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const values = entries.flatMap((entry) => [
    entry.weightKg,
    entry.movingAverageKg,
  ]);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const spread = Math.max(rawMax - rawMin, 1);
  const min = rawMin - spread * 0.18;
  const max = rawMax + spread * 0.18;
  const toX = (index: number) =>
    entries.length === 1
      ? padding.left + chartWidth / 2
      : padding.left + (index / (entries.length - 1)) * chartWidth;
  const toY = (value: number) =>
    padding.top + ((max - value) / (max - min)) * chartHeight;
  const rawPoints = entries.map((entry, index) => ({
    x: toX(index),
    y: toY(entry.weightKg),
    entry,
  }));
  const averagePoints = entries.map((entry, index) => ({
    x: toX(index),
    y: toY(entry.movingAverageKg),
    entry,
  }));
  const rawLine = rawPoints.map((point) => point.x + "," + point.y).join(" ");
  const averageLine = averagePoints
    .map((point) => point.x + "," + point.y)
    .join(" ");
  const area =
    "M " +
    averagePoints[0].x +
    " " +
    (padding.top + chartHeight) +
    " L " +
    averagePoints.map((point) => point.x + " " + point.y).join(" L ") +
    " L " +
    averagePoints.at(-1)!.x +
    " " +
    (padding.top + chartHeight) +
    " Z";
  const labelIndexes = [
    ...new Set([0, Math.floor((entries.length - 1) / 2), entries.length - 1]),
  ];

  return (
    <div className="relative">
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-6 bg-sky-300" />
          Peso registrado
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-6 bg-emerald-400" />
          Media movel de 7 dias
        </span>
      </div>
      <div className="overflow-x-auto" aria-label="Grafico da evolucao do peso">
        <svg
          viewBox={"0 0 " + width + " " + height}
          className="min-h-64 w-full min-w-[36rem]"
          role="img"
        >
          <title>Evolucao do peso e media movel de sete dias</title>
          <defs>
            <linearGradient id="weight-average-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
            <filter id="weight-average-glow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
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
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  className="text-border"
                  strokeDasharray="5 7"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-muted-foreground text-[11px]"
                >
                  {formatWeight(value)}
                </text>
              </g>
            );
          })}

          <path d={area} fill="url(#weight-average-area)" />
          <polyline
            points={rawLine}
            fill="none"
            stroke="#7dd3fc"
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.72"
          />
          <polyline
            points={averageLine}
            fill="none"
            stroke="#34d399"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            filter="url(#weight-average-glow)"
          />

          {rawPoints.map((point, index) => (
            <circle
              key={point.entry.id}
              cx={point.x}
              cy={point.y}
              r={index === rawPoints.length - 1 ? 4.5 : 3}
              fill="#7dd3fc"
              stroke="#111827"
              strokeWidth="2"
            >
              <title>
                {format(parseISO(point.entry.measuredOn), "dd/MM/yyyy") +
                  ": " +
                  formatWeight(point.entry.weightKg) +
                  " kg"}
              </title>
            </circle>
          ))}

          {labelIndexes.map((index) => {
            const point = rawPoints[index];
            return (
              <text
                key={point.entry.id}
                x={point.x}
                y={height - 13}
                textAnchor={
                  index === 0
                    ? "start"
                    : index === entries.length - 1
                      ? "end"
                      : "middle"
                }
                className="fill-muted-foreground text-[11px]"
              >
                {format(parseISO(point.entry.measuredOn), "dd MMM", {
                  locale: ptBR,
                })}
              </text>
            );
          })}
        </svg>
      </div>
      {isLoading && (
        <span className="absolute right-2 top-0 rounded-full bg-background/80 px-2 py-1 text-xs text-muted-foreground">
          Atualizando...
        </span>
      )}
    </div>
  );
}
