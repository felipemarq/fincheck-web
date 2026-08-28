import { useAuth } from "@/app/hooks/useAuth";
import { Navigate, Outlet, useLocation } from "react-router-dom";
//import {useAuth} from "../app/hooks/useAuth";

interface AuthGuardProps {
  isPrivate: boolean;
}
export const AuthGuard = ({ isPrivate }: AuthGuardProps) => {
  const { signedIn } = useAuth();
  const location = useLocation();

  if (!signedIn && isPrivate) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ returnTo }} />;
  }

  if (signedIn && !isPrivate) {
    const state = location.state as { returnTo?: string } | null;
    const returnTo = state?.returnTo;
    const safeReturnTo =
      returnTo?.startsWith("/") && !returnTo.startsWith("//")
        ? returnTo
        : "/";

    return <Navigate to={safeReturnTo} replace />;
  }

  return <Outlet />;
};
