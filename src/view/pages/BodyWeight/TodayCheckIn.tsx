import {
  IconActivity,
  IconCheck,
  IconFlame,
  IconScale,
} from "@tabler/icons-react";
import { useState } from "react";
import { NumericFormat } from "react-number-format";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type TodayCheckInValues = {
  weightKg: number | null;
  caloriesConsumed: number | null;
  caloriesBurned: number | null;
};

export function TodayCheckIn({
  initialWeightKg,
  initialCaloriesConsumed,
  initialCaloriesBurned,
  isSaving,
  onSave,
}: {
  initialWeightKg: number | null;
  initialCaloriesConsumed: number | null;
  initialCaloriesBurned: number | null;
  isSaving: boolean;
  onSave(values: TodayCheckInValues): Promise<void>;
}) {
  const [weightKg, setWeightKg] = useState(initialWeightKg);
  const [caloriesConsumed, setCaloriesConsumed] = useState(
    initialCaloriesConsumed
  );
  const [caloriesBurned, setCaloriesBurned] = useState(
    initialCaloriesBurned
  );

  return (
    <Card className="overflow-hidden border-sky-400/15 bg-[linear-gradient(105deg,rgba(14,165,233,0.08),rgba(16,185,129,0.04)_48%,transparent)] py-0">
      <form
        className="grid gap-5 p-5 lg:grid-cols-[minmax(12rem,0.7fr)_repeat(3,minmax(0,1fr))_auto] lg:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          void onSave({ weightKg, caloriesConsumed, caloriesBurned });
        }}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
            Check-in de hoje
          </p>
          <h3 className="mt-2 text-xl font-semibold">Como foi seu dia?</h3>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Salve peso, consumo e gasto total juntos ou preencha o que tiver agora.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="today-weight" className="flex items-center gap-2">
            <IconScale className="size-4 text-sky-300" /> Peso de hoje
          </Label>
          <NumericFormat
            id="today-weight"
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="today-calories" className="flex items-center gap-2">
            <IconFlame className="size-4 text-amber-300" /> Consumo de hoje
          </Label>
          <NumericFormat
            id="today-calories"
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="today-calories-burned" className="flex items-center gap-2">
            <IconActivity className="size-4 text-sky-300" /> Gasto total
          </Label>
          <NumericFormat
            id="today-calories-burned"
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
        </div>

        <Button
          type="submit"
          className="w-full lg:w-auto"
          isLoading={isSaving}
        >
          <IconCheck /> Salvar hoje
        </Button>
      </form>
    </Card>
  );
}
