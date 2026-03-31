import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { QueryKeys } from "@/app/config/QueryKeys";
import type { Contact } from "@/app/entities/Contact";
import { useAuth } from "@/app/hooks/useAuth";
import { contactService } from "@/app/services/contactService";
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

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome é obrigatório.")
    .max(120, "Nome deve ter no máximo 120 caracteres."),
  email: z
    .string()
    .trim()
    .email("Informe um e-mail válido.")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(40, "Telefone deve ter no máximo 40 caracteres.")
    .optional()
    .or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: "create" | "update";
  contact?: Contact.Attributes | null;
}

export function ContactModal({
  isOpen,
  onClose,
  action,
  contact,
}: ContactModalProps) {
  const { selectedEntityId } = useAuth();
  const queryClient = useQueryClient();

  const defaultValues = useMemo<FormData>(
    () => ({
      name: contact?.name ?? "",
      email: contact?.email ?? "",
      phone: contact?.phone ?? "",
    }),
    [contact?.email, contact?.name, contact?.phone]
  );

  const {
    register,
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

  const { isPending: isCreating, mutateAsync: createContact } = useMutation({
    mutationFn: contactService.create,
  });

  const { isPending: isUpdating, mutateAsync: updateContact } = useMutation({
    mutationFn: contactService.update,
  });

  const onSubmit = handleSubmit(async (data) => {
    if (!selectedEntityId) {
      return;
    }

    const payload = {
      entityId: selectedEntityId,
      name: data.name,
      email: data.email || undefined,
      phone: data.phone || undefined,
    };

    try {
      if (action === "update" && contact?.id) {
        await updateContact({
          contactId: contact.id,
          ...payload,
        });
        toast.success("Contato atualizado com sucesso!");
      } else {
        await createContact(payload);
        toast.success("Contato criado com sucesso!");
      }

      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.CONTACTS, selectedEntityId],
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
            {action === "update" ? "Editar contato" : "Novo contato"}
          </DialogTitle>
          <DialogDescription>
            {action === "update"
              ? "Atualize os dados do contato da entidade ativa."
              : "Cadastre um contato para reutilizar em transacoes e recorrencias."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              type="text"
              placeholder="Ex: João da Silva"
              error={errors.name?.message}
              {...register("name")}
            />
          </div>

          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input
              type="email"
              placeholder="joao@empresa.com"
              error={errors.email?.message}
              {...register("email")}
            />
          </div>

          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input
              type="text"
              placeholder="(11) 99999-9999"
              error={errors.phone?.message}
              {...register("phone")}
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
            <Button
              type="submit"
              className="flex-1"
              isLoading={isCreating || isUpdating}
            >
              {action === "update" ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
