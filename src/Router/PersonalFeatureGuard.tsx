import type { PersonalFeature } from "@/app/entities/User";
import { useAuth } from "@/app/hooks/useAuth";
import { Navigate, Outlet } from "react-router-dom";

export function PersonalFeatureGuard({
  feature,
}: {
  feature: PersonalFeature;
}) {
  const { user } = useAuth();

  if (!(user?.features ?? []).includes(feature)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
