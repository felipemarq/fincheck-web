import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";

import { useAuth } from "@/app/hooks/useAuth";
import { useAccounts } from "@/app/hooks/useAccounts";
import { QueryKeys } from "@/app/config/QueryKeys";
import { creditCardService } from "@/app/services/creditCardService";
import type { CreditCard } from "@/app/entities/CreditCard";
import { treatAxiosError } from "@/app/utils/treatAxiosError";
import { InputCurrency } from "../components/InputCurrency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  accountId: z.string().min(1, "Conta é obrigatória"),
  name: z.string().min(1, "Nome é obrigatório"),
  color: z.string().min(1, "Cor é obrigatória"),
  creditLimit: z.number().min(1, "Limite é obrigatório"),
  closingDay: z.number().int().min(1).max(28),
  dueDay: z.number().int().min(1).max(28),
});

type FormData = z.infer<typeof schema>;

interface CreditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: "create" | "update";
  creditCard?: CreditCard.Attributes | null;
}

const DEFAULT_COLOR = "#0f766e";

export function CreditCardModal({
  isOpen,
  onClose,
  action,
  creditCard,
}: CreditCardModalProps) {
  const { selectedEntityId } = useAuth();
  const queryClient = useQueryClient();
  const { accounts, isFetchingAccounts } = useAccounts(
    {
      entityId: selectedEntityId!,
    },
    Boolean(selectedEntityId)
  );

  const {
    control,
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      accountId: creditCard?.accountId ?? "",
      name: creditCard?.name ?? "",
      color: creditCard?.color ?? DEFAULT_COLOR,
      creditLimit: creditCard?.creditLimit ?? 0,
      closingDay: creditCard?.closingDay ?? 1,
      dueDay: creditCard?.dueDay ?? 1,
    },
  });

  useEffect(() => {
    if (!isOpen) return;

    reset({
      accountId: creditCard?.accountId ?? "",
      name: creditCard?.name ?? "",
      color: creditCard?.color ?? DEFAULT_COLOR,
      creditLimit: creditCard?.creditLimit ?? 0,
      closingDay: creditCard?.closingDay ?? 1,
      dueDay: creditCard?.dueDay ?? 1,
    });
  }, [creditCard, isOpen, reset]);

  const { isPending: isCreating, mutateAsync: createCreditCard } = useMutation({
    mutationFn: creditCardService.create,
  });

  const { isPending: isUpdating, mutateAsync: updateCreditCard } = useMutation({
    mutationFn: creditCardService.update,
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (action === "update" && creditCard?.id) {
        await updateCreditCard({
          creditCardId: creditCard.id,
          entityId: selectedEntityId!,
          ...data,
        });
        toast.success("Cartão atualizado com sucesso!");
      } else {
        await createCreditCard({
          entityId: selectedEntityId!,
          ...data,
        });
        toast.success("Cartão criado com sucesso!");
      }

      queryClient.invalidateQueries({ queryKey: [QueryKeys.CREDIT_CARDS] });
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
            {action === "update" ? "Editar cartão" : "Novo cartão"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Limite</Label>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 tracking-[-0.5px] text-lg">
                R$
              </span>
              <Controller
                control={control}
                name="creditLimit"
                render={({ field: { onChange, value } }) => (
                  <InputCurrency
                    value={typeof value === "number" ? value : 0}
                    onChange={onChange}
                    error={errors.creditLimit?.message}
                  />
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              type="text"
              placeholder="Ex: Visa Principal"
              error={errors.name?.message}
              {...register("name")}
            />
          </div>

          <div className="space-y-2">
            <Label>Conta de pagamento</Label>
            <Controller
              control={control}
              name="accountId"
              render={({ field: { onChange, value } }) => (
                <Select value={value} onValueChange={onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  {!isFetchingAccounts && (
                    <SelectContent>
                      {accounts?.map((account) => (
                        <SelectItem key={account.id} value={account.id!}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  )}
                </Select>
              )}
            />
            {errors.accountId?.message && (
              <p className="text-sm text-red-500">{errors.accountId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fechamento</Label>
              <Input
                type="number"
                min={1}
                max={28}
                error={errors.closingDay?.message}
                {...register("closingDay", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>Vencimento</Label>
              <Input
                type="number"
                min={1}
                max={28}
                error={errors.dueDay?.message}
                {...register("dueDay", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <Controller
              control={control}
              name="color"
              render={({ field: { onChange, value } }) => (
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="h-10 w-16 cursor-pointer rounded border bg-transparent"
                  />
                  <Input
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                  />
                </div>
              )}
            />
          </div>

          <div className="flex space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={isCreating || isUpdating}
              className="flex-1"
            >
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
