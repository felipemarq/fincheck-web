"use client";

import type React from "react";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Account } from "@/app/entities/Account";
import z from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { treatAxiosError } from "@/app/utils/treatAxiosError";
import type { AxiosError } from "axios";
import { toast } from "sonner";
import { ACCOUNT_TYPE_LABELS_PT } from "../i18n/pt/account";
import { accountService } from "@/app/services/accountService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/hooks/useAuth";
import { QueryKeys } from "@/app/config/QueryKeys";
import { InputCurrency } from "../components/InputCurrency";

const schema = z.object({
  initialBalance: z.union([
    z.string().min(1, "Saldo é obrigatório"),
    z.number(),
  ]),
  name: z.string().min(1, "Nome da conta é obrigatório"),
  type: z.enum(["CHECKING", "INVESTMENT", "CASH"]),
  color: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface AccountModalProps {
  action: "create" | "update";
  isOpen: boolean;
  onClose: () => void;
  account?: Account.Attributes;
  isMandatory?: boolean;
}

export function AccountModal({
  isOpen,
  onClose,
  account,
  action,
  isMandatory = false,
}: AccountModalProps) {
  const { selectedEntityId } = useAuth();
  const queryClient = useQueryClient();
  const {
    handleSubmit: hookFormHandleSubmit,
    register,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      color: account?.color,
      name: account?.name,
      type: account?.type,
      initialBalance: account?.initialBalance,
    },
  });

  const {
    isPending: isLoadingCreateAccount,
    mutateAsync: mutateAsyncCreateAccount,
  } = useMutation({ mutationFn: accountService.create });
  console.log(selectedEntityId);
  const handleSubmit = hookFormHandleSubmit(async (data) => {
    console.log(selectedEntityId);

    try {
      if (action === "create") {
        await mutateAsyncCreateAccount({
          name: data.name,
          entityId: selectedEntityId!,
          initialBalance: Number(data.initialBalance),
          type: data.type as Account.Type,
        });
        queryClient.invalidateQueries({ queryKey: [QueryKeys.ACCOUNTS] });
        toast("Conta criada com sucesso!");
      }

      if (action === "update") {
        //mutateAsyncUpdate
        toast("Conta editada com sucesso!");
      }
      onClose();
    } catch (error) {
      treatAxiosError(error as AxiosError);
    }
  });

  const handleOpenChange = (open: boolean) => {
    if (!open && isMandatory) return;
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {action === "update" ? "Editar Conta" : "Nova Conta"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Saldo Inicial */}
          <div className="space-y-2">
            <Label>Saldo Inicial</Label>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 tracking-[-0.5px] text-lg">
                R$
              </span>
              <Controller
                control={control}
                name="initialBalance"
                render={({ field: { onChange, value } }) => (
                  <InputCurrency
                    onChange={onChange}
                    value={value}
                    error={errors.initialBalance?.message}
                  />
                )}
              />
            </div>
          </div>
          {/* Nome */}
          <div className="space-y-2">
            <Label>Nome da Conta</Label>
            <Input
              type="text"
              placeholder="Nome da Conta"
              error={errors.name?.message}
              {...register("name")}
            />
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo de Conta</Label>
            <Controller
              control={control}
              defaultValue="CHECKING"
              name="type"
              render={({ field: { onChange, value } }) => (
                <Select value={value} onValueChange={onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(ACCOUNT_TYPE_LABELS_PT).map((key) => (
                      <SelectItem key={key} value={key}>
                        {ACCOUNT_TYPE_LABELS_PT[key as Account.Type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Buttons */}
          <div className="flex space-x-2 pt-4">
            {!isMandatory && (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 "
              >
                Cancelar
              </Button>
            )}
            <Button
              isLoading={isLoadingCreateAccount}
              type="submit"
              className="flex-1 "
            >
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
