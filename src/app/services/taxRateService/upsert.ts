import type { TaxRate } from "@/app/entities/TaxRate";
import { httpClient } from "../httpClient";

export interface UpsertTaxRateParams {
  entityId: string;
  year: number;
  month: number;
  ratePercent: number;
}

interface UpsertTaxRateResponse {
  taxRate: TaxRate.Attributes;
}

export const upsert = async ({
  entityId,
  year,
  month,
  ratePercent,
}: UpsertTaxRateParams) => {
  const { data } = await httpClient.put<UpsertTaxRateResponse>(
    `/entities/${entityId}/tax-rates/${year}/${month}`,
    {
      ratePercent,
    }
  );

  return data.taxRate;
};
