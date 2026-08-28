import { useQuery } from "@tanstack/react-query";
import { QueryKeys } from "../config/QueryKeys";
import {
  bodyWeightService,
} from "../services/bodyWeightService";
import type { GetBodyWeightsParams } from "../services/bodyWeightService/getAll";

export function useBodyWeights(params: GetBodyWeightsParams) {
  return useQuery({
    queryKey: [QueryKeys.BODY_WEIGHTS, params.from ?? null, params.to ?? null],
    queryFn: () => bodyWeightService.getAll(params),
  });
}
