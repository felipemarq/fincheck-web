import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { z } from "zod";

import type { Entity } from "@/app/entities/Entity";
import { QueryKeys } from "@/app/config/QueryKeys";
import { useAuth } from "@/app/hooks/useAuth";
import { entityService } from "@/app/services/entityService";
import { treatAxiosError } from "@/app/utils/treatAxiosError";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ENTITY_TYPE_LABELS: Record<Entity["type"], string> = {
  PF: "Pessoa física",
  PJ: "Pessoa jurídica",
};

const colorRegex = /^#[0-9A-Fa-f]{6}$/;

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome da entidade é obrigatório.")
    .max(120, "Nome deve ter no máximo 120 caracteres."),
  type: z.enum(["PF", "PJ"]),
  color: z.string().regex(colorRegex, "Cor deve estar no formato hexadecimal."),
});

type FormData = z.infer<typeof schema>;

interface EntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: "create" | "update";
  entity?: Entity | null;
}

export function EntityModal({
  isOpen,
  onClose,
  action,
  entity,
}: EntityModalProps) {
  const { handleChangeSelectedEntityId } = useAuth();
  const queryClient = useQueryClient();

  const defaultValues = useMemo<FormData>(
    () => ({
      name: entity?.name ?? "",
      type: entity?.type ?? "PF",
      color: entity?.color ?? "#228be6",
    }),
    [entity?.color, entity?.name, entity?.type]
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    reset(defaultValues);
  }, [defaultValues, isOpen, reset]);

  const { isPending: isCreating, mutateAsync: createEntity } = useMutation({
    mutationFn: entityService.create,
  });

  const { isPending: isUpdating, mutateAsync: updateEntity } = useMutation({
    mutationFn: entityService.update,
  });

  const isSubmitting = isCreating || isUpdating;

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (action === "update" && entity?.id) {
        await updateEntity({
          entityId: entity.id,
          ...data,
        });
        toast.success("Entidade atualizada com sucesso!");
      } else {
        const createdEntity = await createEntity(data);
        handleChangeSelectedEntityId(createdEntity.id);
        toast.success("Entidade criada com sucesso!");
      }

      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.ME],
      });
      onClose();
    } catch (error) {
      treatAxiosError(error);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {action === "update" ? "Editar entidade" : "Nova entidade"}
          </DialogTitle>
          <DialogDescription>
            {action === "update"
              ? "Atualize o nome, o tipo e a cor da entidade selecionada."
              : "Crie uma nova entidade para separar seus dados PF e PJ com dashboard, contatos, cartões e transações independentes."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da entidade</Label>
            <Input
              type="text"
              placeholder="Ex: João Pessoa Física ou Minha Empresa LTDA"
              error={errors.name?.message}
              {...register("name")}
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Controller
              control={control}
              name="type"
              render={({ field: { onChange, value } }) => (
                <Select value={value} onValueChange={onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ENTITY_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Cor de identificação</Label>
            <Controller
              control={control}
              name="color"
              render={({ field: { onChange, value } }) => (
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    className="h-10 w-16 p-1"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                  />
                  <Input
                    type="text"
                    className="flex-1 uppercase"
                    placeholder="#228BE6"
                    error={errors.color?.message}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                  />
                </div>
              )}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" isLoading={isSubmitting}>
              {action === "update" ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
