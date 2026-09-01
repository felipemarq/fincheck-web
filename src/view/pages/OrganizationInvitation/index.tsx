import { IconBuilding, IconCheck, IconClock, IconUserShield } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { QueryKeys } from "@/app/config/QueryKeys";
import type { OrganizationRole } from "@/app/entities/OrganizationAccess";
import { useAuth } from "@/app/hooks/useAuth";
import { organizationTeamService } from "@/app/services/organizationTeamService";
import { treatAxiosError } from "@/app/utils/treatAxiosError";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/view/components/ui/badge";

const roleLabels: Record<OrganizationRole, string> = {
  OWNER: "Proprietario",
  ADMIN: "Administrador",
  COMMERCIAL: "Comercial",
  OPERATIONS: "Operacoes",
  FINANCE: "Financeiro",
  VIEWER: "Visualizador",
};

export default function OrganizationInvitationPage() {
  const { token = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { signedIn, handleChangeSelectedEntityId } = useAuth();

  const invitationQuery = useQuery({
    queryKey: ["organizationInvitation", token],
    queryFn: () => organizationTeamService.getInvitation(token),
    enabled: Boolean(token),
    retry: false,
  });
  const acceptMutation = useMutation({
    mutationFn: organizationTeamService.acceptInvitation,
  });

  const accept = async () => {
    try {
      const result = await acceptMutation.mutateAsync(token);
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.ME] });
      handleChangeSelectedEntityId(result.entityId);
      toast.success(`Voce agora faz parte de ${result.organizationName}.`);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      treatAxiosError(error);
    }
  };

  if (invitationQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-muted-foreground">
        Validando convite...
      </div>
    );
  }

  if (invitationQuery.isError || !invitationQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle>Convite nao encontrado</CardTitle>
            <CardDescription>
              O link pode estar incorreto, revogado ou ja ter sido utilizado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to={signedIn ? "/dashboard" : "/login"}>Voltar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const invitation = invitationQuery.data;
  const registerParams = new URLSearchParams({
    email: invitation.email,
    returnTo: location.pathname,
  });

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.2),transparent_45%)]" />
      <Card className="relative w-full max-w-xl overflow-hidden">
        <div className="h-1 bg-emerald-400" />
        <CardHeader className="items-center text-center">
          <div className="mb-2 rounded-2xl bg-emerald-500/10 p-4 text-emerald-400">
            <IconBuilding className="size-9" />
          </div>
          <CardTitle className="text-2xl">Convite para a equipe</CardTitle>
          <CardDescription>
            Voce foi convidado para participar de uma organizacao no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-2xl border bg-muted/20 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Organizacao
            </p>
            <p className="mt-1 text-xl font-semibold">{invitation.organizationName}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge className="bg-emerald-500/15 text-emerald-300">
                <IconUserShield />
                {roleLabels[invitation.role]}
              </Badge>
              <Badge variant={invitation.expired ? "destructive" : "outline"}>
                <IconClock />
                {invitation.expired ? "Convite expirado" : invitation.email}
              </Badge>
            </div>
          </div>

          {invitation.expired ? (
            <p className="text-center text-sm text-muted-foreground">
              Solicite ao proprietario um novo convite.
            </p>
          ) : signedIn ? (
            <Button
              className="w-full"
              size="lg"
              onClick={accept}
              isLoading={acceptMutation.isPending}
            >
              <IconCheck />
              Aceitar convite
            </Button>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Button asChild size="lg">
                <Link to="/login" state={{ returnTo: location.pathname }}>
                  Entrar para aceitar
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to={`/register?${registerParams.toString()}`}>
                  Criar minha conta
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
