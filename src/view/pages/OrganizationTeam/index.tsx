import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconCopy,
  IconMailPlus,
  IconShieldCheck,
  IconTrash,
  IconUsersGroup,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { QueryKeys } from "@/app/config/QueryKeys";
import type {
  InvitableOrganizationRole,
  OrganizationRole,
} from "@/app/entities/OrganizationAccess";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/view/components/ui/badge";

const roles: Array<{
  value: InvitableOrganizationRole;
  label: string;
  description: string;
}> = [
  { value: "ADMIN", label: "Administrador", description: "Equipe e operacao" },
  { value: "COMMERCIAL", label: "Comercial", description: "Clientes e cotacoes" },
  { value: "OPERATIONS", label: "Operacoes", description: "Compras e entregas" },
  { value: "FINANCE", label: "Financeiro", description: "Pagar e receber" },
  { value: "VIEWER", label: "Visualizador", description: "Somente leitura" },
];

const roleLabels: Record<OrganizationRole, string> = {
  OWNER: "Proprietario",
  ADMIN: "Administrador",
  COMMERCIAL: "Comercial",
  OPERATIONS: "Operacoes",
  FINANCE: "Financeiro",
  VIEWER: "Visualizador",
};

const invitationSchema = z.object({
  email: z.string().trim().email("Informe um e-mail valido."),
  role: z.enum(["ADMIN", "COMMERCIAL", "OPERATIONS", "FINANCE", "VIEWER"]),
});

type InvitationFormData = z.infer<typeof invitationSchema>;

export default function OrganizationTeamPage() {
  const queryClient = useQueryClient();
  const { activeEntity, can, selectedEntityId, user } = useAuth();
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const {
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InvitationFormData>({
    resolver: zodResolver(invitationSchema),
    defaultValues: { email: "", role: "COMMERCIAL" },
  });

  const teamQuery = useQuery({
    queryKey: [QueryKeys.ORGANIZATION_TEAM, selectedEntityId],
    queryFn: () => organizationTeamService.getTeam(selectedEntityId!),
    enabled: Boolean(selectedEntityId),
  });

  const invalidateTeam = () =>
    queryClient.invalidateQueries({
      queryKey: [QueryKeys.ORGANIZATION_TEAM, selectedEntityId],
    });

  const inviteMutation = useMutation({
    mutationFn: organizationTeamService.createInvitation,
  });
  const updateMutation = useMutation({
    mutationFn: organizationTeamService.updateMember,
  });
  const removeMutation = useMutation({
    mutationFn: organizationTeamService.removeMember,
  });
  const revokeMutation = useMutation({
    mutationFn: organizationTeamService.revokeInvitation,
  });

  const invite = handleSubmit(async (formData) => {
    if (!selectedEntityId) return;

    try {
      const result = await inviteMutation.mutateAsync({
        entityId: selectedEntityId,
        email: formData.email,
        role: formData.role,
      });
      const link = `${window.location.origin}/invite/${result.token}`;
      setInvitationLink(link);
      await invalidateTeam();
      reset({ email: "", role: "COMMERCIAL" });
      toast.success("Convite criado. Compartilhe o link com a pessoa.");
    } catch (error) {
      treatAxiosError(error);
    }
  });

  const copyInvitationLink = async () => {
    if (!invitationLink) return;
    try {
      await navigator.clipboard.writeText(invitationLink);
      toast.success("Link copiado.");
    } catch {
      toast.error("Nao foi possivel copiar. Selecione o link manualmente.");
    }
  };

  const updateRole = async (
    membershipId: string,
    role: InvitableOrganizationRole
  ) => {
    if (!selectedEntityId) return;
    try {
      await updateMutation.mutateAsync({
        entityId: selectedEntityId,
        membershipId,
        role,
      });
      await invalidateTeam();
      toast.success("Papel atualizado.");
    } catch (error) {
      treatAxiosError(error);
    }
  };

  const removeMember = async (membershipId: string, name: string) => {
    if (!selectedEntityId || !window.confirm(`Remover ${name} da organizacao?`)) {
      return;
    }
    try {
      await removeMutation.mutateAsync({ entityId: selectedEntityId, membershipId });
      await invalidateTeam();
      toast.success("Acesso removido.");
    } catch (error) {
      treatAxiosError(error);
    }
  };

  const revokeInvitation = async (invitationId: string) => {
    if (!selectedEntityId) return;
    try {
      await revokeMutation.mutateAsync({ entityId: selectedEntityId, invitationId });
      await invalidateTeam();
      toast.success("Convite revogado.");
    } catch (error) {
      treatAxiosError(error);
    }
  };

  const members = teamQuery.data?.members ?? [];
  const invitations = teamQuery.data?.invitations ?? [];
  const canInvite = can("members.invite");
  const canUpdate = can("members.update");
  const canRemove = can("members.remove");

  return (
    <div className="flex flex-col gap-6 px-4 py-5 lg:px-6 lg:py-7">
      <section className="relative overflow-hidden rounded-2xl border bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.2),transparent_40%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent)] p-5 sm:p-7">
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
              Acesso da organizacao
            </p>
            <h2 className="text-3xl font-semibold tracking-tight">Equipe e permissoes</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Convide pessoas para {activeEntity?.name}. Cada papel recebe apenas
              os modulos e as acoes necessarios para o trabalho.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border bg-background/60 px-4 py-3 backdrop-blur">
            <IconShieldCheck className="size-6 text-emerald-400" />
            <div>
              <p className="text-xs text-muted-foreground">Seu papel</p>
              <p className="font-semibold">
                {activeEntity ? roleLabels[activeEntity.role] : "Nao informado"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Membros ativos</CardDescription>
            <CardTitle className="text-3xl">{members.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Convites pendentes</CardDescription>
            <CardTitle className="text-3xl text-amber-400">{invitations.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Modelo de acesso</CardDescription>
            <CardTitle className="text-lg">Papeis fixos e seguros</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {canInvite && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconMailPlus className="size-5 text-emerald-400" />
              Convidar pessoa
            </CardTitle>
            <CardDescription>
              O link vale por sete dias e precisa ser aceito com o mesmo e-mail.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={invite} className="grid gap-4 md:grid-cols-[1fr_240px_auto] md:items-end">
              <div className="space-y-2">
                <Label htmlFor="team-email">E-mail</Label>
                <Input
                  id="team-email"
                  type="email"
                  placeholder="pessoa@empresa.com.br"
                  error={errors.email?.message}
                  {...register("email")}
                />
              </div>
              <div className="space-y-2">
                <Label>Papel inicial</Label>
                <Select
                  value={watch("role")}
                  onValueChange={(value) =>
                    setValue("role", value as InvitableOrganizationRole, {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <span>{role.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {role.description}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" isLoading={inviteMutation.isPending}>
                Criar convite
              </Button>
            </form>

            {invitationLink && (
              <div className="flex flex-col gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:flex-row sm:items-center">
                <Input value={invitationLink} readOnly className="font-mono text-xs" />
                <Button type="button" variant="outline" onClick={copyInvitationLink}>
                  <IconCopy />
                  Copiar link
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconUsersGroup className="size-5 text-emerald-400" />
            Pessoas com acesso
          </CardTitle>
          <CardDescription>
            O proprietario nao pode ser removido nem ter seu papel alterado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {teamQuery.isLoading && (
            <p className="py-6 text-sm text-muted-foreground">Carregando equipe...</p>
          )}
          {teamQuery.isError && (
            <div className="flex items-center gap-3 py-6">
              <p className="text-sm text-destructive">Nao foi possivel carregar a equipe.</p>
              <Button variant="outline" onClick={() => teamQuery.refetch()}>
                Tentar novamente
              </Button>
            </div>
          )}
          {members.map((member) => {
            const protectedMember =
              member.role === "OWNER" || member.userId === user?.id;
            return (
              <div
                key={member.id}
                className="flex flex-col gap-4 rounded-xl border bg-muted/10 p-4 lg:flex-row lg:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 font-semibold text-emerald-400">
                    {member.user.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{member.user.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {member.user.email}
                    </p>
                  </div>
                </div>

                {member.role === "OWNER" ? (
                  <Badge className="bg-emerald-500/15 text-emerald-300">
                    Proprietario
                  </Badge>
                ) : (
                  <Select
                    value={member.role}
                    disabled={!canUpdate || protectedMember || updateMutation.isPending}
                    onValueChange={(value) =>
                      updateRole(member.id, value as InvitableOrganizationRole)
                    }
                  >
                    <SelectTrigger className="w-full lg:w-52">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {canRemove && !protectedMember && (
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Remover ${member.user.name}`}
                    onClick={() => removeMember(member.id, member.user.name)}
                  >
                    <IconTrash />
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Convites aguardando aceite</CardTitle>
            <CardDescription>
              Convites expirados podem ser revogados e criados novamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{invitation.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {roleLabels[invitation.role]} - vence em{" "}
                    {format(new Date(invitation.expiresAt), "dd 'de' MMMM", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <Badge variant={invitation.isExpired ? "destructive" : "outline"}>
                  {invitation.isExpired ? "Expirado" : "Pendente"}
                </Badge>
                {canInvite && (
                  <Button
                    variant="outline"
                    onClick={() => revokeInvitation(invitation.id)}
                    isLoading={revokeMutation.isPending}
                  >
                    Revogar
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
