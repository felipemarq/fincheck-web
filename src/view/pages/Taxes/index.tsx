import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { useAuth } from "@/app/hooks/useAuth";
import { useDashboard } from "@/app/hooks/useDashboard";
import { QueryKeys } from "@/app/config/QueryKeys";
import { taxRateService } from "@/app/services/taxRateService";
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
import { InputCurrency } from "@/view/components/InputCurrency";

const schema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  ratePercent: z.number().min(0).max(100),
});

type FormData = z.infer<typeof schema>;

const monthOptions = Array.from({ length: 12 }, (_, index) => {
  const date = new Date(Date.UTC(2026, index, 1));
  return {
    value: index + 1,
    label: format(date, "MMMM", { locale: ptBR }),
  };
});

export default function Taxes() {
  const { selectedEntityId } = useAuth();
  const queryClient = useQueryClient();
  const currentMonthDate = new Date();
  const nextMonthDate = addMonths(currentMonthDate, 1);

  const {
    dashboard,
    isFetchingDashboard,
    refetchDashboard,
  } = useDashboard(
    {
      entityId: selectedEntityId!,
      sections: ["tax"],
      range: "this-month",
    },
    Boolean(selectedEntityId)
  );

  const currentTax = dashboard?.tax;

  const {
    control,
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      year: currentMonthDate.getUTCFullYear(),
      month: currentMonthDate.getUTCMonth() + 1,
      ratePercent: currentTax?.ratePercent ?? 0,
    },
  });

  useEffect(() => {
    reset({
      year: currentMonthDate.getUTCFullYear(),
      month: currentMonthDate.getUTCMonth() + 1,
      ratePercent: currentTax?.ratePercent ?? 0,
    });
  }, [currentTax?.ratePercent, reset, currentMonthDate]);

  const { isPending, mutateAsync } = useMutation({
    mutationFn: taxRateService.upsert,
  });

  const projectedTax = useMemo(() => {
    if (!currentTax) return 0;
    if (currentTax.ratePercent == null) return 0;

    return Number(
      (currentTax.income * (currentTax.ratePercent / 100)).toFixed(2)
    );
  }, [currentTax]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      await mutateAsync({
        entityId: selectedEntityId!,
        year: data.year,
        month: data.month,
        ratePercent: data.ratePercent,
      });

      await queryClient.invalidateQueries({ queryKey: [QueryKeys.DASHBOARD] });
      await refetchDashboard();
      toast.success("Alíquota salva com sucesso!");
    } catch (error) {
      treatAxiosError(error);
    }
  });

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-3 px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-semibold">Impostos</h1>
          <p className="text-muted-foreground text-sm">
            Configure a alíquota mensal da entidade para melhorar a estimativa
            tributária exibida no dashboard.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Configuração mensal</CardTitle>
            <CardDescription>
              A configuração atual impacta o card de imposto estimado do
              dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Ano</Label>
                  <Input
                    type="number"
                    min={2000}
                    max={2100}
                    error={errors.year?.message}
                    {...register("year", { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Mês</Label>
                  <select
                    className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                    {...register("month", { valueAsNumber: true })}
                  >
                    {monthOptions.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                  {errors.month?.message && (
                    <p className="text-sm text-red-500">{errors.month.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Alíquota (%)</Label>
                  <Controller
                    control={control}
                    name="ratePercent"
                    render={({ field: { onChange, value } }) => (
                      <InputCurrency
                        value={typeof value === "number" ? value : 0}
                        onChange={onChange}
                        error={errors.ratePercent?.message}
                      />
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" isLoading={isPending}>
                  Salvar alíquota
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo tributário</CardTitle>
            <CardDescription>Mês atual e projeção rápida.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Competência</span>
              <strong>{currentTax?.month ?? "—"}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Receita no mês</span>
              <strong>
                {currentTax?.income?.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }) ?? "—"}
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Alíquota atual</span>
              <strong>
                {currentTax?.ratePercent != null
                  ? `${currentTax.ratePercent.toFixed(2)}%`
                  : "Não configurada"}
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Imposto estimado</span>
              <strong>
                {projectedTax.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </strong>
            </div>
            <div className="rounded-lg border border-dashed p-3 text-muted-foreground">
              {currentTax?.missingRate
                ? "A competência atual ainda não possui alíquota configurada."
                : `A próxima competência é ${format(nextMonthDate, "MMMM/yyyy", {
                    locale: ptBR,
                  })}.`}
            </div>
            {isFetchingDashboard && (
              <div className="text-muted-foreground">Atualizando dados...</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
