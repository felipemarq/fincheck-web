import { useMemo, useState } from "react";
import { Building2, Plus, UserRound } from "lucide-react";

import type { Entity } from "@/app/entities/Entity";
import { useAuth } from "@/app/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EntityModal } from "@/view/modals/EntityModal";

const ENTITY_TYPE_LABELS: Record<Entity["type"], string> = {
  PF: "Pessoa física",
  PJ: "Pessoa jurídica",
};

function formatDate(value?: string) {
  if (!value) return "Agora";
  return new Date(value).toLocaleDateString("pt-BR");
}

export default function Entities() {
  const { user, selectedEntityId, handleChangeSelectedEntityId } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [entityBeingEdited, setEntityBeingEdited] = useState<Entity | null>(null);

  const entities = user?.entities ?? [];

  const summary = useMemo(
    () => ({
      total: entities.length,
      pf: entities.filter((entity) => entity.type === "PF").length,
      pj: entities.filter((entity) => entity.type === "PJ").length,
    }),
    [entities]
  );

  const activeEntity = useMemo(
    () =>
      entities.find((entity) => entity.id === selectedEntityId) ?? entities[0] ?? null,
    [entities, selectedEntityId]
  );

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-3 px-4 lg:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Entidades</h1>
          <p className="text-muted-foreground text-sm">
            Cada entidade separa completamente seu ambiente financeiro. Use uma
            PF para pessoa física e crie quantas PJs precisar para empresas,
            filiais ou operações distintas.
          </p>
        </div>
        <Button className="w-full md:w-auto" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 size-4" />
          Nova entidade
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total</CardDescription>
            <CardTitle>{summary.total}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Entidades disponíveis para este usuário.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Pessoas físicas</CardDescription>
            <CardTitle>{summary.pf}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Estruturas pessoais separadas do restante do negócio.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Pessoas jurídicas</CardDescription>
            <CardTitle>{summary.pj}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Empresas, CNPJs ou operações independentes.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Entidade ativa</CardDescription>
            <CardTitle>{activeEntity?.name ?? "Nenhuma"}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {activeEntity
              ? `${ENTITY_TYPE_LABELS[activeEntity.type]} atualmente em uso no app.`
              : "Selecione ou crie uma entidade para começar."}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Como isso funciona</CardTitle>
            <CardDescription>
              A entidade define o contexto dos dados do produto.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Contas, transações, recorrências, contatos, cartões, impostos e
              o dashboard ficam separados por entidade.
            </p>
            <p>
              Ao criar uma nova entidade, o app já prepara as categorias padrão
              para você começar a operar sem precisar configurar tudo do zero.
            </p>
            <p>
              Depois de trocar a entidade ativa, as demais telas passam a
              carregar os dados dela automaticamente.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 xl:col-span-2 md:grid-cols-2">
          {entities.map((entity) => {
            const isActive = entity.id === selectedEntityId;
            const Icon = entity.type === "PF" ? UserRound : Building2;

            return (
              <Card
                key={entity.id}
                className={isActive ? "border-primary shadow-sm" : undefined}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex size-11 items-center justify-center rounded-xl text-white"
                        style={{ backgroundColor: entity.color }}
                      >
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <CardTitle>{entity.name}</CardTitle>
                        <CardDescription>
                          {ENTITY_TYPE_LABELS[entity.type]}
                        </CardDescription>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isActive ? "Ativa" : "Inativa"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Criada em {formatDate(entity.createdAt)}</p>
                    <p>Cor de identificação: {entity.color}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      variant={isActive ? "secondary" : "default"}
                      onClick={() => handleChangeSelectedEntityId(entity.id)}
                    >
                      {isActive ? "Entidade ativa" : "Usar esta entidade"}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setEntityBeingEdited(entity)}
                    >
                      Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {entities.length === 0 && (
            <Card className="md:col-span-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <Building2 className="size-10 text-muted-foreground" />
                <div>
                  <p className="font-medium">Nenhuma entidade disponível</p>
                  <p className="text-muted-foreground text-sm">
                    Crie uma entidade PF ou PJ para começar a separar seus
                    dados financeiros.
                  </p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="mr-2 size-4" />
                  Criar entidade
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <EntityModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        action="create"
      />

      <EntityModal
        isOpen={Boolean(entityBeingEdited)}
        onClose={() => setEntityBeingEdited(null)}
        action="update"
        entity={entityBeingEdited}
      />
    </div>
  );
}
