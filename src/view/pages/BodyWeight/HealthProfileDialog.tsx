import {
  IconActivity,
  IconInfoCircle,
  IconSettings,
  IconTargetArrow,
} from "@tabler/icons-react";
import { format, subYears } from "date-fns";
import { useEffect, useState } from "react";
import { NumericFormat } from "react-number-format";
import { toast } from "sonner";

import type {
  ActivityLevel,
  CalculationSex,
  PersonalHealthProfile,
} from "@/app/entities/PersonalHealth";
import type { UpsertPersonalHealthProfileParams } from "@/app/services/personalHealthService/upsert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProfileValues = Omit<UpsertPersonalHealthProfileParams, "onDate">;

export function HealthProfileDialog({
  open,
  profile,
  isSaving,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  profile: PersonalHealthProfile | null;
  isSaving: boolean;
  onOpenChange(open: boolean): void;
  onSave(values: ProfileValues): Promise<void>;
}) {
  const [targetWeightKg, setTargetWeightKg] = useState<number | null>(null);
  const [targetDate, setTargetDate] = useState("");
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [birthDate, setBirthDate] = useState("");
  const [calculationSex, setCalculationSex] =
    useState<CalculationSex | null>(null);
  const [activityLevel, setActivityLevel] =
    useState<ActivityLevel | null>(null);
  const [overrideKcal, setOverrideKcal] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setTargetWeightKg(profile?.targetWeightKg ?? null);
    setTargetDate(profile?.targetDate ?? "");
    setHeightCm(profile?.heightCm ?? null);
    setBirthDate(profile?.birthDate ?? "");
    setCalculationSex(profile?.calculationSex ?? null);
    setActivityLevel(profile?.activityLevel ?? null);
    setOverrideKcal(profile?.dailyExpenditureOverrideKcal ?? null);
  }, [open, profile]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (targetWeightKg !== null && (targetWeightKg < 20 || targetWeightKg > 500)) {
      toast.error("Informe uma meta entre 20 e 500 kg.");
      return;
    }
    if (heightCm !== null && (heightCm < 120 || heightCm > 250)) {
      toast.error("Informe uma altura entre 120 e 250 cm.");
      return;
    }
    if (overrideKcal !== null && (overrideKcal < 500 || overrideKcal > 10_000)) {
      toast.error("O gasto manual deve ficar entre 500 e 10.000 kcal.");
      return;
    }

    await onSave({
      targetWeightKg,
      targetDate: targetDate || null,
      heightCm,
      birthDate: birthDate || null,
      calculationSex,
      activityLevel,
      dailyExpenditureOverrideKcal: overrideKcal,
    });
  };

  const clearEnergyProfile = () => {
    setHeightCm(null);
    setBirthDate("");
    setCalculationSex(null);
    setActivityLevel(null);
    setOverrideKcal(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconSettings className="size-5 text-emerald-400" />
            Meta e estimativa de energia
          </DialogTitle>
          <DialogDescription>
            A meta funciona sozinha. Os dados corporais servem apenas para
            estimar gasto energetico e podem ser substituidos por um valor
            diario informado por voce.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-6" onSubmit={submit}>
          <section className="rounded-xl border bg-emerald-500/[0.04] p-4">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300">
                <IconTargetArrow className="size-5" />
              </div>
              <div>
                <h3 className="font-medium">Objetivo de peso</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  A data e opcional e nao altera os calculos.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Meta de peso">
                <NumericFormat
                  customInput={Input}
                  value={targetWeightKg ?? ""}
                  decimalScale={3}
                  decimalSeparator=","
                  thousandSeparator="."
                  suffix=" kg"
                  allowNegative={false}
                  placeholder="Ex.: 75 kg"
                  onValueChange={({ floatValue }) =>
                    setTargetWeightKg(floatValue ?? null)
                  }
                />
              </Field>
              <Field label="Data-alvo (opcional)">
                <Input
                  type="date"
                  value={targetDate}
                  onChange={(event) => setTargetDate(event.target.value)}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-xl border bg-sky-500/[0.04] p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-300">
                  <IconActivity className="size-5" />
                </div>
                <div>
                  <h3 className="font-medium">Estimativa de gasto diario</h3>
                  <p className="mt-1 max-w-lg text-xs leading-5 text-muted-foreground">
                    O gasto em repouso usa peso, altura, idade e o coeficiente
                    selecionado. O nivel de atividade transforma essa base em
                    uma estimativa diaria.
                  </p>
                </div>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={clearEnergyProfile}>
                Limpar estimativa
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Altura">
                <NumericFormat
                  customInput={Input}
                  value={heightCm ?? ""}
                  decimalScale={0}
                  suffix=" cm"
                  allowNegative={false}
                  placeholder="Ex.: 180 cm"
                  onValueChange={({ floatValue }) =>
                    setHeightCm(floatValue ?? null)
                  }
                />
              </Field>
              <Field label="Data de nascimento">
                <Input
                  type="date"
                  max={format(subYears(new Date(), 18), "yyyy-MM-dd")}
                  value={birthDate}
                  onChange={(event) => setBirthDate(event.target.value)}
                />
              </Field>
              <Field label="Coeficiente usado na equacao">
                <Select
                  value={calculationSex ?? undefined}
                  onValueChange={(value) =>
                    setCalculationSex(value as CalculationSex)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Masculino</SelectItem>
                    <SelectItem value="FEMALE">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Nivel habitual de atividade">
                <Select
                  value={activityLevel ?? undefined}
                  onValueChange={(value) =>
                    setActivityLevel(value as ActivityLevel)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEDENTARY_LIGHT">
                      Sedentario ou leve
                    </SelectItem>
                    <SelectItem value="ACTIVE_MODERATE">
                      Ativo ou moderado
                    </SelectItem>
                    <SelectItem value="VIGOROUS">
                      Intenso ou vigoroso
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Gasto diario manual (opcional)" className="sm:col-span-2">
                <NumericFormat
                  customInput={Input}
                  value={overrideKcal ?? ""}
                  decimalScale={0}
                  decimalSeparator=","
                  thousandSeparator="."
                  suffix=" kcal"
                  allowNegative={false}
                  placeholder="Substitui a estimativa, ex.: 2400 kcal"
                  onValueChange={({ floatValue }) =>
                    setOverrideKcal(floatValue ?? null)
                  }
                />
              </Field>
            </div>

            <div className="mt-4 flex gap-2 rounded-lg border border-amber-400/20 bg-amber-500/[0.06] p-3 text-xs leading-5 text-muted-foreground">
              <IconInfoCircle className="mt-0.5 size-4 shrink-0 text-amber-300" />
              <p>
                Estes valores sao estimativas para adultos e nao substituem
                avaliacao medica ou nutricional. Gestacao e amamentacao exigem
                orientacao profissional especifica.
              </p>
            </div>
          </section>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Salvar configuracao
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
