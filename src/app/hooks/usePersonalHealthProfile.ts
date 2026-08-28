import { useQuery } from "@tanstack/react-query";
import { QueryKeys } from "../config/QueryKeys";
import { personalHealthService } from "../services/personalHealthService";

export function usePersonalHealthProfile(onDate: string) {
  return useQuery({
    queryKey: [QueryKeys.PERSONAL_HEALTH_PROFILE, onDate],
    queryFn: () => personalHealthService.get(onDate),
  });
}
