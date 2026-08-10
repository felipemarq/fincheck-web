import { useState } from "react";
import {
  IconCalculator,
  IconReceiptTax,
  IconRefresh,
  IconTrendingUp,
  IconTruck,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InputCurrency } from "@/view/components/InputCurrency";
import { formatCurrency } from "@/view/pages/PurchaseOrders/purchaseOrderPresentation";

const MAX_TAX_RATE = 0.245;

type PricingProjection = {
  markupAmount: number;
  subtotalBeforeTax: number;
  taxAmount: number;
  finalPrice: number;
};

function calculatePricing(
  purchaseCost: number,
  freight: number,
  markupRate: number,
): PricingProjection {
  const markupAmount = purchaseCost * markupRate;
  const subtotalBeforeTax = purchaseCost + markupAmount;
  const taxAmount = subtotalBeforeTax * MAX_TAX_RATE;

  return {
    markupAmount,
    subtotalBeforeTax,
    taxAmount,
    finalPrice: subtotalBeforeTax + taxAmount + freight,
  };
}

export default function PricingCalculator() {
  const [purchaseCost, setPurchaseCost] = useState(0);
  const [freight, setFreight] = useState(0);

  const pricingWithSeventyPercent = calculatePricing(
    purchaseCost,
    freight,
    0.7,
  );
  const pricingWithOneHundredPercent = calculatePricing(
    purchaseCost,
    freight,
    1,
  );

  const resetCalculator = () => {
    setPurchaseCost(0);
    setFreight(0);
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-5 lg:px-6 lg:py-7">
      <section className="relative overflow-hidden rounded-2xl border bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.12),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent)] p-5 sm:p-7">
        <div className="absolute -right-16 -top-20 size-56 rounded-full border border-emerald-400/10" />
        <div className="relative max-w-3xl space-y-3">
          <div className="flex size-11 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-300">
            <IconCalculator className="size-6" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
            Apoio para cotacoes
          </p>
          <h2 className="text-3xl font-semibold tracking-tight">
            Calculadora de precificacao
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Informe o custo estimado e o frete para comparar imediatamente os
            precos sugeridos com acrescimo comercial de 70% e 100%.
          </p>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(19rem,0.72fr)_minmax(0,1.5fr)]">
        <Card className="overflow-hidden xl:sticky xl:top-6">
          <div className="h-1 bg-gradient-to-r from-amber-400 via-emerald-400 to-sky-400" />
          <CardHeader className="pt-1">
            <CardTitle>Dados do produto</CardTitle>
            <CardDescription>
              Use o valor que voce espera pagar pelo item. O frete sera somado
              somente no final.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="block space-y-2">
              <span className="text-sm font-medium">Custo de compra</span>
              <InputCurrency
                variant="field"
                value={purchaseCost}
                onChange={setPurchaseCost}
              />
              <span className="block text-xs text-muted-foreground">
                Valor base usado nos dois cenarios.
              </span>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Frete do item</span>
              <InputCurrency
                variant="field"
                value={freight}
                onChange={setFreight}
              />
              <span className="block text-xs text-muted-foreground">
                Nao recebe acrescimo comercial nem imposto.
              </span>
            </label>

            <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-xs leading-5 text-muted-foreground">
              <p className="font-medium text-foreground">Formula aplicada</p>
              <p className="mt-1 font-mono">
                ((custo + acrescimo) + 24,5%) + frete
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={purchaseCost === 0 && freight === 0}
              onClick={resetCalculator}
            >
              <IconRefresh />
              Limpar valores
            </Button>
          </CardContent>
        </Card>

        <section className="grid gap-4 md:grid-cols-2">
          <PricingResultCard
            label="Opcao com 70%"
            description="Custo mais 70% de acrescimo comercial"
            markupLabel="Acrescimo de 70%"
            purchaseCost={purchaseCost}
            freight={freight}
            projection={pricingWithSeventyPercent}
            accent="amber"
          />
          <PricingResultCard
            label="Opcao com 100%"
            description="Custo mais 100% de acrescimo comercial"
            markupLabel="Acrescimo de 100%"
            purchaseCost={purchaseCost}
            freight={freight}
            projection={pricingWithOneHundredPercent}
            accent="emerald"
          />
        </section>
      </div>
    </div>
  );
}

function PricingResultCard({
  label,
  description,
  markupLabel,
  purchaseCost,
  freight,
  projection,
  accent,
}: {
  label: string;
  description: string;
  markupLabel: string;
  purchaseCost: number;
  freight: number;
  projection: PricingProjection;
  accent: "amber" | "emerald";
}) {
  const accentClasses =
    accent === "amber"
      ? {
          border: "border-amber-400/30",
          background: "bg-amber-500/10",
          text: "text-amber-300",
          bar: "bg-amber-400",
        }
      : {
          border: "border-emerald-400/30",
          background: "bg-emerald-500/10",
          text: "text-emerald-300",
          bar: "bg-emerald-400",
        };

  return (
    <Card className={`overflow-hidden ${accentClasses.border}`}>
      <div className={`h-1 ${accentClasses.bar}`} />
      <CardHeader className="pt-1">
        <div
          className={`mb-2 flex size-9 items-center justify-center rounded-lg ${accentClasses.background} ${accentClasses.text}`}
        >
          <IconTrendingUp className="size-5" />
        </div>
        <CardTitle>{label}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className={`rounded-xl border p-4 ${accentClasses.border} ${accentClasses.background}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Preco sugerido
          </p>
          <p className={`mt-2 text-3xl font-bold tracking-tight ${accentClasses.text}`}>
            {formatCurrency(projection.finalPrice)}
          </p>
        </div>

        <div className="space-y-3 text-sm">
          <PricingLine label="Custo de compra" value={purchaseCost} />
          <PricingLine label={markupLabel} value={projection.markupAmount} />
          <PricingLine
            label="Base antes do imposto"
            value={projection.subtotalBeforeTax}
            emphasized
          />
          <PricingLine
            icon={<IconReceiptTax className="size-4" />}
            label="Imposto de 24,5%"
            value={projection.taxAmount}
          />
          <PricingLine
            icon={<IconTruck className="size-4" />}
            label="Frete"
            value={freight}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function PricingLine({
  icon,
  label,
  value,
  emphasized = false,
}: {
  icon?: React.ReactNode;
  label: string;
  value: number;
  emphasized?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0 ${
        emphasized ? "font-medium text-foreground" : "text-muted-foreground"
      }`}
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className="shrink-0 font-medium text-foreground">
        {formatCurrency(value)}
      </span>
    </div>
  );
}
