"use client";

import * as React from "react";
import { Pie, PieChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/view/components/ui/card"; // ou "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/view/components/ui/chart"; // ou "@/components/ui/chart"

// ==== tipos vindos do teu /dashboard ====
type TopCategory = {
  categoryId: string;
  name: string;
  icon: string;
  amount: number;
};

type Props = {
  topCategories: TopCategory[];
  title?: string;
  subtitle?: string;
};

// util p/ chave estável
const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-");

export function TopCategoriesChart({
  topCategories,
  title = "Top categorias",
  subtitle,
}: Props) {
  const total = topCategories.reduce((acc, c) => acc + c.amount, 0);
  const empty = topCategories.length === 0 || total === 0;

  // Mapeia dados do gráfico
  const chartData = topCategories.map((c, i) => {
    const key = `${slug(c.name)}-${c.categoryId.slice(0, 6)}`;
    const colorIdx = (i % 12) + 1; // var(--chart-1..12)
    return {
      // nome da "série" usado pela legenda (precisa bater com as keys do config)
      cat: key,
      amount: +c.amount.toFixed(2),
      // o ChartContainer cria a var --color-<key> a partir do config
      fill: `var(--color-${key})`,
      // opcional: manter info bruta pra tooltip custom
      _label: c.name,
      _percent: total > 0 ? +((c.amount / total) * 100).toFixed(2) : 0,
      _colorVar: `var(--chart-${colorIdx})`,
    };
  });

  // Config dinâmico (legenda usa o label daqui + cor)
  const chartConfig: ChartConfig = chartData.reduce<ChartConfig>(
    (acc, d) => {
      acc[d.cat] = {
        label:
          topCategories.find((c) => d.cat.startsWith(slug(c.name)))?.name ??
          d.cat,
        color: d._colorVar,
      };
      return acc;
    },
    { amount: { label: "Total" } } as ChartConfig
  );

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>{title}</CardTitle>
        {subtitle && <CardDescription>{subtitle}</CardDescription>}
      </CardHeader>

      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  // mostra valor + % na tooltip
                  //@ts-ignore
                  renderValue={(p) => {
                    const v = (p?.payload as any) ?? {};
                    const value = typeof v.amount === "number" ? v.amount : 0;
                    const pct = typeof v._percent === "number" ? v._percent : 0;
                    return (
                      <div className="flex flex-col gap-1">
                        <div className="font-medium">{v._label ?? v.cat}</div>
                        <div className="text-muted-foreground">
                          {value.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}{" "}
                          ({pct}%)
                        </div>
                      </div>
                    );
                  }}
                />
              }
            />
            <Pie
              data={chartData}
              dataKey="amount"
              nameKey="cat" // <- a legenda usa este nameKey
              innerRadius={60}
              strokeWidth={2}
              isAnimationActive
            />
            {/* 👇 legenda no estilo do teu exemplo */}
            {!empty && (
              <ChartLegend
                content={<ChartLegendContent nameKey="cat" />}
                className="-translate-y-2 flex-wrap gap-2 *:basis-1/2 *:justify-start md:*:basis-1/3"
              />
            )}
          </PieChart>
        </ChartContainer>

        {empty && (
          <div className="text-muted-foreground py-8 text-center text-sm">
            Sem dados de categorias no período selecionado
          </div>
        )}
      </CardContent>
    </Card>
  );
}
