import { useAuth } from "@/app/hooks/useAuth";
import { Navigate, Outlet } from "react-router-dom";
//import {useAuth} from "../app/hooks/useAuth";

interface AuthGuardProps {
  isPrivate: Boolean;
}
export const AuthGuard = ({ isPrivate }: AuthGuardProps) => {
  // Obtém o estado de autenticação do contexto
  const { signedIn } = useAuth();
  const test = true;

  console.log("signedIn", signedIn);

  if (!test && isPrivate) {
    return <Navigate to="/login" replace />;
  }

  if (test && !isPrivate) {
    return <Navigate to="/" replace />;
  }
  // Se estiver autenticado e a rota for privada, permite o acesso à rota privada
  // Se não estiver autenticado e a rota não for privada, permite o acesso à rota pública
  return <Outlet />;
};
