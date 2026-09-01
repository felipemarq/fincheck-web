import {
  IconActivity,
  IconCalendar,
  IconChartLine,
  IconCheck,
  IconFlame,
  IconHistory,
  IconInfoCircle,
  IconLock,
  IconRefresh,
  IconScale,
  IconSettings,
  IconTargetArrow,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { NumericFormat } from "react-number-format";
import { toast } from "sonner";

import { QueryKeys } from "@/app/config/QueryKeys";
import type { BodyWeightEntry } from "@/app/entities/BodyWeightEntry";
import type { DailyCalorieEntry } from "@/app/entities/DailyCalorieEntry";
import { useBodyWeights } from "@/app/hooks/useBodyWeights";
import { useDailyCalories } from "@/app/hooks/useDailyCalories";
import { usePersonalHealthProfile } from "@/app/hooks/usePersonalHealthProfile";
import { bodyWeightService } from "@/app/services/bodyWeightService";
import { dailyCalorieService } from "@/app/services/dailyCalorieService";
import { personalHealthService } from "@/app/services/personalHealthService";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/view/components/ui/tabs";
import {
  calculateGoalProjection,
  calculateMovingAverage,
  comparePeriods,
  summarizeHealthWeek,
} from "./analytics";
import { CalorieWeek } from "./CalorieWeek";
import { CalorieHistory, WeightHistory } from "./HealthHistory";
import { HealthProfileDialog } from "./HealthProfileDialog";
import { TodayCheckIn, type TodayCheckInValues } from "./TodayCheckIn";
import { WeeklyOverview } from "./WeeklyOverview";
import { WeightChart } from "./WeightChart";

type WeightRange = "30" | "90" | "365" | "all";
type EntryTab = "weight" | "calories";

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

function formatKcal(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(Math.abs(value));
}

function formatEntryDate(value: string, long = false) {
  const pattern = long ? "dd 'de' MMMM 'de' yyyy" : "dd/MM/yyyy";
  return format(parseISO(value), pattern, { locale: ptBR });
}

function formatDelta(value: number | null) {
  if (value === null) return "Sem base";
  const prefix = value > 0 ? "+" : "";
  return prefix + formatWeight(value) + " kg";
}

function formatWeeklyBalance(value: number | null) {
  if (value === null) return "Sem calculo";
  if (value >= 0) return "Deficit " + formatKcal(value);
  return "Superavit " + formatKcal(value);
}

export default function BodyWeight() {
  const today = format(new Date(), "yyyy-MM-dd");
  const queryClient = useQueryClient();
  const [range, setRange] = useState<WeightRange>("30");
  const [entryTab, setEntryTab] = useState<EntryTab>("weight");
  const [measuredOn, setMeasuredOn] = useState(today);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [editingWeightDate, setEditingWeightDate] = useState<string | null>(null);
  const [loggedOn, setLoggedOn] = useState(today);
  const [caloriesConsumed, setCaloriesConsumed] = useState<number | null>(null);
  const [caloriesBurned, setCaloriesBurned] = useState<number | null>(null);
  const [editingCalorieDate, setEditingCalorieDate] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const weightQuery = useBodyWeights({ to: today });
  const calorieQuery = useDailyCalories({ to: today });
  const profileQuery = usePersonalHealthProfile(today);
  const upsertWeightMutation = useMutation({ mutationFn: bodyWeightService.upsert });
  const deleteWeightMutation = useMutation({ mutationFn: bodyWeightService.remove });
  const upsertCalorieMutation = useMutation({ mutationFn: dailyCalorieService.upsert });
  const deleteCalorieMutation = useMutation({ mutationFn: dailyCalorieService.remove });
  const profileMutation = useMutation({ mutationFn: personalHealthService.upsert });

  const allWeights = weightQuery.data ?? [];
  const allCalories = calorieQuery.data?.entries ?? [];
  const rangeFrom =
    range === "all"
      ? null
      : format(subDays(parseISO(today), Number(range) - 1), "yyyy-MM-dd");
  const weights = rangeFrom
    ? allWeights.filter((entry) => entry.measuredOn >= rangeFrom)
    : allWeights;
  const movingPoints = calculateMovingAverage(allWeights).filter(
    (entry) => !rangeFrom || entry.measuredOn >= rangeFrom
  );
  const latestWeight = allWeights.at(-1);
  const latestMovingPoint = calculateMovingAverage(allWeights).at(-1);
  const weeklyComparison = comparePeriods(allWeights, 7, today);
  const monthlyComparison = comparePeriods(allWeights, 30, today);
  const profile = profileQuery.data?.profile ?? null;
  const calculation = profileQuery.data?.calculation;
  const weeklySummary = summarizeHealthWeek(allWeights, allCalories, today);
  const goalProjection = calculateGoalProjection({
    entries: allWeights,
    targetWeightKg: profile?.targetWeightKg ?? null,
    targetDate: profile?.targetDate ?? null,
    endDate: today,
  });
  const todayWeight = allWeights.find((entry) => entry.measuredOn === today);
  const todayCalories = allCalories.find((entry) => entry.loggedOn === today);

  const resetWeightForm = () => {
    setMeasuredOn(today);
    setWeightKg(null);
    setEditingWeightDate(null);
  };

  const resetCalorieForm = () => {
    setLoggedOn(today);
    setCaloriesConsumed(null);
    setCaloriesBurned(null);
    setEditingCalorieDate(null);
  };

  const invalidateWeightDependencies = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [QueryKeys.BODY_WEIGHTS] }),
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.PERSONAL_HEALTH_PROFILE],
      }),
      queryClient.invalidateQueries({ queryKey: [QueryKeys.DAILY_CALORIES] }),
    ]);
  };

  const saveWeight = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!weightKg || weightKg < 20 || weightKg > 500) {
      toast.error("Informe um peso entre 20 e 500 kg.");
      return;
    }

    try {
      await upsertWeightMutation.mutateAsync({ measuredOn, weightKg });
      await invalidateWeightDependencies();
      toast.success(
        editingWeightDate ? "Pesagem atualizada." : "Pesagem registrada."
      );
      resetWeightForm();
    } catch (error) {
      treatAxiosError(error);
    }
  };

  const saveCalories = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      caloriesConsumed === null ||
      caloriesConsumed < 0 ||
      caloriesConsumed > 20_000 ||
      !Number.isInteger(caloriesConsumed)
    ) {
      toast.error("Informe um total entre 0 e 20.000 kcal.");
      return;
    }
    if (
      caloriesBurned !== null &&
      (caloriesBurned < 500 ||
        caloriesBurned > 10_000 ||
        !Number.isInteger(caloriesBurned))
    ) {
      toast.error("Informe um gasto total entre 500 e 10.000 kcal.");
      return;
    }

    try {
      await upsertCalorieMutation.mutateAsync({
        loggedOn,
        caloriesConsumed,
        caloriesBurned,
      });
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.DAILY_CALORIES] });
      toast.success(
        editingCalorieDate ? "Calorias atualizadas." : "Calorias registradas."
      );
      resetCalorieForm();
    } catch (error) {
      treatAxiosError(error);
    }
  };

  const saveToday = async ({
    weightKg: todayWeightKg,
    caloriesConsumed: todayCaloriesConsumed,
    caloriesBurned: todayCaloriesBurned,
  }: TodayCheckInValues) => {
    if (
      todayWeightKg === null &&
      todayCaloriesConsumed === null &&
      todayCaloriesBurned === null
    ) {
      toast.error("Informe o peso, o consumo, o gasto ou mais de um valor.");
      return;
    }
    if (
      todayWeightKg !== null &&
      (todayWeightKg < 20 || todayWeightKg > 500)
    ) {
      toast.error("Informe um peso entre 20 e 500 kg.");
      return;
    }
    if (todayCaloriesBurned !== null && todayCaloriesConsumed === null) {
      toast.error("Informe tambem o consumo para registrar o gasto do dia.");
      return;
    }
    if (
      todayCaloriesBurned !== null &&
      (todayCaloriesBurned < 500 ||
        todayCaloriesBurned > 10_000 ||
        !Number.isInteger(todayCaloriesBurned))
    ) {
      toast.error("Informe um gasto total entre 500 e 10.000 kcal.");
      return;
    }
    if (
      todayCaloriesConsumed !== null &&
      (todayCaloriesConsumed < 0 ||
        todayCaloriesConsumed > 20_000 ||
        !Number.isInteger(todayCaloriesConsumed))
    ) {
      toast.error("Informe um total entre 0 e 20.000 kcal.");
      return;
    }

    const shouldSaveWeight =
      todayWeightKg !== null && todayWeightKg !== todayWeight?.weightKg;
    const shouldSaveCalories =
      todayCaloriesConsumed !== null &&
      (todayCaloriesConsumed !== todayCalories?.caloriesConsumed ||
        todayCaloriesBurned !== todayCalories?.caloriesBurned);
    if (!shouldSaveWeight && !shouldSaveCalories) {
      toast.info("Os valores de hoje ja estao atualizados.");
      return;
    }

    try {
      const operations: Promise<unknown>[] = [];
      if (shouldSaveWeight) {
        operations.push(
          upsertWeightMutation.mutateAsync({
            measuredOn: today,
            weightKg: todayWeightKg!,
          })
        );
      }
      if (shouldSaveCalories) {
        operations.push(
          upsertCalorieMutation.mutateAsync({
            loggedOn: today,
            caloriesConsumed: todayCaloriesConsumed!,
            caloriesBurned: todayCaloriesBurned,
          })
        );
      }

      await Promise.all(operations);
      await invalidateWeightDependencies();
      toast.success("Check-in de hoje salvo.");
    } catch (error) {
      treatAxiosError(error);
    }
  };

  const editWeight = (entry: BodyWeightEntry) => {
    setEntryTab("weight");
    setMeasuredOn(entry.measuredOn);
    setWeightKg(entry.weightKg);
    setEditingWeightDate(entry.measuredOn);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const editCalories = (entry: DailyCalorieEntry) => {
    setEntryTab("calories");
    setLoggedOn(entry.loggedOn);
    setCaloriesConsumed(entry.caloriesConsumed);
    setCaloriesBurned(entry.caloriesBurned);
    setEditingCalorieDate(entry.loggedOn);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteWeight = async (entry: BodyWeightEntry) => {
    if (!window.confirm("Excluir a pesagem de " + formatEntryDate(entry.measuredOn) + "?")) {
      return;
    }

    try {
      await deleteWeightMutation.mutateAsync(entry.measuredOn);
      await invalidateWeightDependencies();
      if (editingWeightDate === entry.measuredOn) resetWeightForm();
      toast.success("Pesagem excluida.");
    } catch (error) {
      treatAxiosError(error);
    }
  };

  const deleteCalories = async (entry: DailyCalorieEntry) => {
    if (!window.confirm("Excluir as calorias de " + formatEntryDate(entry.loggedOn) + "?")) {
      return;
    }

    try {
      await deleteCalorieMutation.mutateAsync(entry.loggedOn);
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.DAILY_CALORIES] });
      if (editingCalorieDate === entry.loggedOn) resetCalorieForm();
      toast.success("Registro de calorias excluido.");
    } catch (error) {
      treatAxiosError(error);
    }
  };

  const saveProfile = async (
    values: Parameters<typeof HealthProfileDialog>[0]["onSave"] extends (
      input: infer T
    ) => Promise<void>
      ? T
      : never
  ) => {
    try {
      await profileMutation.mutateAsync({ onDate: today, ...values });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.PERSONAL_HEALTH_PROFILE],
        }),
        queryClient.invalidateQueries({ queryKey: [QueryKeys.DAILY_CALORIES] }),
      ]);
      toast.success("Meta e gasto atualizados.");
      setProfileOpen(false);
    } catch (error) {
      treatAxiosError(error);
    }
  };

  const goalDifference =
    latestWeight && profile?.targetWeightKg !== null && profile?.targetWeightKg !== undefined
      ? latestWeight.weightKg - profile.targetWeightKg
      : null;
  const goalHelper =
    goalDifference === null
      ? profile?.targetWeightKg
        ? "Registre seu peso para comparar"
        : "Defina um objetivo opcional"
      : Math.abs(goalDifference) < 0.05
        ? "Meta alcancada"
        : formatWeight(Math.abs(goalDifference)) +
          " kg " +
          (goalDifference > 0 ? "acima" : "abaixo") +
          " da meta";

  return (
    <div className="flex flex-col gap-6 px-4 py-5 lg:px-6 lg:py-7">
      <section className="relative overflow-hidden rounded-2xl border bg-[radial-gradient(circle_at_88%_10%,rgba(14,165,233,0.18),transparent_35%),radial-gradient(circle_at_12%_100%,rgba(16,185,129,0.16),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent)] p-5 sm:p-7">
        <div className="absolute -right-14 -top-20 size-64 rounded-full border border-sky-300/10" />
        <div className="absolute right-14 top-8 hidden size-28 rounded-full border border-emerald-300/10 sm:block" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="flex size-11 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-500/10 text-sky-300">
              <IconActivity className="size-6" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
              Espaco pessoal
            </p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Peso, meta e energia
            </h2>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              Registre peso e calorias, acompanhe tendencias e compare periodos
              sem transformar dias ausentes em resultados artificiais.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 lg:self-auto">
            <IconLock className="size-4" />
            Visivel somente para voce
          </div>
        </div>
      </section>

      <TodayCheckIn
        key={`${todayWeight?.updatedAt ?? "no-weight"}-${todayCalories?.updatedAt ?? "no-calories"}`}
        initialWeightKg={todayWeight?.weightKg ?? null}
        initialCaloriesConsumed={todayCalories?.caloriesConsumed ?? null}
        initialCaloriesBurned={todayCalories?.caloriesBurned ?? null}
        isSaving={
          upsertWeightMutation.isPending || upsertCalorieMutation.isPending
        }
        onSave={saveToday}
      />

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(18rem,0.68fr)_minmax(0,1.55fr)]">
        <Card className="min-w-0 overflow-hidden xl:sticky xl:top-6">
          <div className="h-1 bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-300" />
          <CardHeader className="pt-1">
            <CardTitle>Registro por data</CardTitle>
            <CardDescription>
              Use este formulario para dias anteriores ou para corrigir um
              registro. Salvar novamente atualiza o valor da data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={entryTab} onValueChange={(value) => setEntryTab(value as EntryTab)}>
              <TabsList className="mb-5 grid w-full grid-cols-2">
                <TabsTrigger value="weight">
                  <IconScale /> Peso
                </TabsTrigger>
                <TabsTrigger value="calories">
                  <IconFlame /> Calorias
                </TabsTrigger>
              </TabsList>

              <TabsContent value="weight">
                <form className="space-y-5" onSubmit={saveWeight}>
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
                    isLoading={upsertWeightMutation.isPending}
                  >
                    <IconCheck />
                    {editingWeightDate ? "Salvar alteracao" : "Registrar peso"}
                  </Button>
                  {editingWeightDate && (
                    <Button type="button" variant="outline" className="w-full" onClick={resetWeightForm}>
                      Cancelar edicao
                    </Button>
                  )}
                </form>
              </TabsContent>

              <TabsContent value="calories">
                <form className="space-y-5" onSubmit={saveCalories}>
                  <div className="space-y-2">
                    <Label htmlFor="calorie-date">Data do consumo</Label>
                    <Input
                      id="calorie-date"
                      type="date"
                      max={today}
                      value={loggedOn}
                      onChange={(event) => setLoggedOn(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="calorie-value">Total consumido no dia</Label>
                    <NumericFormat
                      id="calorie-value"
                      customInput={Input}
                      value={caloriesConsumed ?? ""}
                      decimalScale={0}
                      decimalSeparator=","
                      thousandSeparator="."
                      suffix=" kcal"
                      allowNegative={false}
                      inputMode="numeric"
                      placeholder="Ex.: 2.150 kcal"
                      onValueChange={({ floatValue }) =>
                        setCaloriesConsumed(floatValue ?? null)
                      }
                    />
                    <p className="text-xs leading-5 text-muted-foreground">
                      Informe o total do dia. Refeicoes individuais ficam fora desta versao.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="calorie-burned">Gasto total do dia (opcional)</Label>
                    <NumericFormat
                      id="calorie-burned"
                      customInput={Input}
                      value={caloriesBurned ?? ""}
                      decimalScale={0}
                      decimalSeparator=","
                      thousandSeparator="."
                      suffix=" kcal"
                      allowNegative={false}
                      inputMode="numeric"
                      placeholder="Ex.: 2.650 kcal"
                      onValueChange={({ floatValue }) =>
                        setCaloriesBurned(floatValue ?? null)
                      }
                    />
                    <p className="text-xs leading-5 text-muted-foreground">
                      Use o gasto energetico total, nao apenas o exercicio. Se
                      ficar vazio, o sistema usa o gasto do perfil.
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={upsertCalorieMutation.isPending}
                  >
                    <IconCheck />
                    {editingCalorieDate ? "Salvar alteracao" : "Registrar calorias"}
                  </Button>
                  {editingCalorieDate && (
                    <Button type="button" variant="outline" className="w-full" onClick={resetCalorieForm}>
                      Cancelar edicao
                    </Button>
                  )}
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-6">
          <Card className="overflow-hidden border-emerald-400/15 bg-[linear-gradient(115deg,rgba(16,185,129,0.08),transparent_55%)]">
            <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-300">
                  <IconTargetArrow className="size-6" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Sua meta
                  </p>
                  <p className="mt-1 text-2xl font-semibold">
                    {profile?.targetWeightKg
                      ? formatWeight(profile.targetWeightKg) + " kg"
                      : "Ainda nao definida"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{goalHelper}</p>
                  {profile?.targetDate && (
                    <p className="mt-1 text-xs text-emerald-300">
                      Data-alvo: {formatEntryDate(profile.targetDate, true)}
                    </p>
                  )}
                </div>
              </div>
              <Button type="button" variant="outline" onClick={() => setProfileOpen(true)}>
                <IconSettings /> Configurar meta e gasto
              </Button>
            </CardContent>
          </Card>

          <WeeklyOverview
            summary={weeklySummary}
            projection={goalProjection}
          />

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Peso atual"
              value={latestWeight ? formatWeight(latestWeight.weightKg) + " kg" : "--"}
              helper={latestWeight ? formatEntryDate(latestWeight.measuredOn) : "Nenhuma pesagem"}
              icon={<IconScale className="size-5" />}
              tone="sky"
            />
            <MetricCard
              label="Media movel 7 dias"
              value={latestMovingPoint ? formatWeight(latestMovingPoint.movingAverageKg) + " kg" : "--"}
              helper={latestMovingPoint ? "Ate " + formatEntryDate(latestMovingPoint.measuredOn) : "Sem dados"}
              icon={<IconChartLine className="size-5" />}
              tone="emerald"
            />
            <MetricCard
              label="Semana vs. anterior"
              value={formatDelta(weeklyComparison.deltaKg)}
              helper={weeklyComparison.currentCount + " e " + weeklyComparison.previousCount + " registros comparados"}
              icon={<IconCalendar className="size-5" />}
              tone="amber"
            />
            <MetricCard
              label="30 dias vs. anteriores"
              value={formatDelta(monthlyComparison.deltaKg)}
              helper={monthlyComparison.currentCount + " e " + monthlyComparison.previousCount + " registros comparados"}
              icon={<IconHistory className="size-5" />}
              tone="slate"
            />
          </section>

          <Card className="overflow-hidden">
            <CardHeader className="gap-4 border-b">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Tendencia de peso</CardTitle>
                  <CardDescription className="mt-1 max-w-2xl">
                    A media movel usa os registros do dia e dos seis dias anteriores.
                    Ela suaviza oscilacoes diarias; dias sem pesagem nao contam como zero.
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
              {weightQuery.isError ? (
                <ErrorState message="Nao foi possivel carregar suas pesagens." onRetry={() => weightQuery.refetch()} />
              ) : (
                <WeightChart entries={movingPoints} isLoading={weightQuery.isFetching} />
              )}
            </CardContent>
          </Card>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <IconFlame className="size-5 text-amber-300" />
              <h3 className="font-semibold">Energia nos ultimos 7 dias</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Gasto em repouso"
                value={calculation?.restingEnergyExpenditureKcal ? formatKcal(calculation.restingEnergyExpenditureKcal) + " kcal" : "--"}
                helper="Base estimada, sem atividade"
                icon={<IconActivity className="size-5" />}
                tone="sky"
              />
              <MetricCard
                label="Gasto base do perfil"
                value={calculation?.effectiveDailyExpenditureKcal ? formatKcal(calculation.effectiveDailyExpenditureKcal) + " kcal" : "--"}
                helper={calculation?.source === "OVERRIDE" ? "Fallback manual do perfil" : calculation?.source === "ESTIMATE" ? "Fallback estimado do perfil" : "Configure o fallback"}
                icon={<IconFlame className="size-5" />}
                tone="amber"
              />
              <MetricCard
                label="Consumo registrado"
                value={formatKcal(weeklySummary.totalConsumedKcal) + " kcal"}
                helper={weeklySummary.calorieDays + "/7 dias registrados"}
                icon={<IconCalendar className="size-5" />}
                tone="slate"
              />
              <MetricCard
                label="Balanco semanal"
                value={formatWeeklyBalance(weeklySummary.totalBalanceKcal)}
                helper={weeklySummary.calculableDays + " dias com calculo"}
                icon={<IconChartLine className="size-5" />}
                tone={weeklySummary.totalBalanceKcal !== null && weeklySummary.totalBalanceKcal < 0 ? "amber" : "emerald"}
              />
            </div>
          </section>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Consumo e gasto por dia</CardTitle>
              <CardDescription>
                Deficit positivo significa que o gasto do dia ficou acima do
                consumo informado. Sem gasto diario, o perfil funciona como fallback.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              {calorieQuery.isError ? (
                <ErrorState message="Nao foi possivel carregar suas calorias." onRetry={() => calorieQuery.refetch()} />
              ) : (
                <CalorieWeek entries={allCalories} today={today} isLoading={calorieQuery.isFetching} />
              )}
              <div className="mt-4 flex gap-2 rounded-lg border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
                <IconInfoCircle className="mt-0.5 size-4 shrink-0 text-sky-300" />
                <p>
                  O gasto e uma estimativa, nao uma prescricao. Ajuste o valor manualmente se voce tiver uma medicao profissional mais adequada.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Historico</CardTitle>
              <CardDescription>
                Edite um valor incorreto ou remova um registro sem afetar o outro acompanhamento.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Tabs defaultValue="weights">
                <TabsList className="mb-3">
                  <TabsTrigger value="weights">Pesagens ({weights.length})</TabsTrigger>
                  <TabsTrigger value="calories">Calorias ({allCalories.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="weights">
                  <WeightHistory
                    entries={weights}
                    deleting={deleteWeightMutation.isPending}
                    onEdit={editWeight}
                    onDelete={deleteWeight}
                  />
                </TabsContent>
                <TabsContent value="calories">
                  <CalorieHistory
                    entries={allCalories}
                    deleting={deleteCalorieMutation.isPending}
                    onEdit={editCalories}
                    onDelete={deleteCalories}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      <HealthProfileDialog
        open={profileOpen}
        profile={profile}
        isSaving={profileMutation.isPending}
        onOpenChange={setProfileOpen}
        onSave={saveProfile}
      />
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
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      </div>
    </Card>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry(): void }) {
  return (
    <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed px-5 text-center">
      <p className="font-medium">{message}</p>
      <p className="mt-1 text-sm text-muted-foreground">Tente novamente em instantes.</p>
      <Button type="button" variant="outline" className="mt-4" onClick={onRetry}>
        <IconRefresh /> Tentar novamente
      </Button>
    </div>
  );
}
