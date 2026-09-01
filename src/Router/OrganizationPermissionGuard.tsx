import type { OrganizationPermission } from "@/app/entities/OrganizationAccess";
import { useAuth } from "@/app/hooks/useAuth";
import { Navigate, Outlet } from "react-router-dom";

export function OrganizationPermissionGuard({
  permission,
}: {
  permission: OrganizationPermission;
}) {
  const { activeEntity, can } = useAuth();

  if (!activeEntity || !can(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
