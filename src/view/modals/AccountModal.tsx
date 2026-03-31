import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { QueryKeys } from "@/app/config/QueryKeys";
import { Account } from "@/app/entities/Account";
import { useAuth } from "@/app/hooks/useAuth";
import { accountService } from "@/app/services/accountService";
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
import { InputCurrency } from "../components/InputCurrency";
import { ACCOUNT_TYPE_LABELS_PT } from "../i18n/pt/account";

const colorRegex = /^#[0-9A-Fa-f]{6}$/;
const DEFAULT_COLOR = "#868E96";

const schema = z.object({
  initialBalance: z.number(),
  name: z
    .string()
    .trim()
    .min(1, "Nome da conta e obrigatorio.")
    .max(120, "Nome deve ter no maximo 120 caracteres."),
  type: z.enum(["CHECKING", "INVESTMENT", "CASH"]),
  color: z.string().regex(colorRegex, "Cor deve estar no formato hexadecimal."),
});

type FormData = z.infer<typeof schema>;

interface AccountModalProps {
  action: "create" | "update";
  isOpen: boolean;
  onClose: () => void;
  account?: Account.Attributes | null;
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

  const defaultValues = useMemo<FormData>(
    () => ({
      color: account?.color ?? DEFAULT_COLOR,
      name: account?.name ?? "",
      type: account?.type ?? Account.Type.CHECKING,
      initialBalance: account?.initialBalance ?? 0,
    }),
    [account?.color, account?.initialBalance, account?.name, account?.type]
  );

  const {
    handleSubmit,
    register,
    control,
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

  const { isPending: isCreating, mutateAsync: createAccount } = useMutation({
    mutationFn: accountService.create,
  });

  const { isPending: isUpdating, mutateAsync: updateAccount } = useMutation({
    mutationFn: accountService.update,
  });

  const onSubmit = handleSubmit(async (data) => {
    if (!selectedEntityId) {
      return;
    }

    const payload = {
      entityId: selectedEntityId,
      initialBalance: Number(data.initialBalance),
      name: data.name,
      type: data.type as Account.Type,
      color: data.color,
    };

    try {
      if (action === "update" && account?.id) {
        await updateAccount({
          accountId: account.id,
          ...payload,
        });
        toast.success("Conta atualizada com sucesso!");
      } else {
        await createAccount(payload);
        toast.success("Conta criada com sucesso!");
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.ACCOUNTS, selectedEntityId],
        }),
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.DASHBOARD],
        }),
      ]);

      onClose();
    } catch (error) {
      treatAxiosError(error);
    }
  });

  const handleOpenChange = (open: boolean) => {
    if (!open && isMandatory) {
      return;
    }

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {action === "update" ? "Editar conta" : "Nova conta"}
          </DialogTitle>
          <DialogDescription>
            {action === "update"
              ? "Atualize os dados da conta da entidade ativa."
              : "Cadastre uma conta para representar banco, caixa fisico ou investimento da entidade ativa."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Saldo inicial</Label>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-lg tracking-[-0.5px]">
                R$
              </span>
              <Controller
                control={control}
                name="initialBalance"
                render={({ field: { onChange, value } }) => (
                  <InputCurrency
                    onChange={onChange}
                    value={typeof value === "number" ? value : 0}
                    error={errors.initialBalance?.message}
                  />
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nome da conta</Label>
            <Input
              type="text"
              placeholder="Ex: Nubank PJ ou Caixa da empresa"
              error={errors.name?.message}
              {...register("name")}
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de conta</Label>
            <Controller
              control={control}
              name="type"
              render={({ field: { onChange, value } }) => (
                <Select value={value} onValueChange={onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCOUNT_TYPE_LABELS_PT).map(
                      ([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Cor de identificacao</Label>
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
                    placeholder="#868E96"
                    error={errors.color?.message}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                  />
                </div>
              )}
            />
          </div>

          <div className="flex gap-2 pt-2">
            {!isMandatory && (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancelar
              </Button>
            )}
            <Button
              isLoading={isCreating || isUpdating}
              type="submit"
              className="flex-1"
            >
              {action === "update" ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
