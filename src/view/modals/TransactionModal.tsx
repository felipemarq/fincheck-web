import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AxiosError } from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

import { InputCurrency } from "../components/InputCurrency";
import { useAuth } from "@/app/hooks/useAuth";
import { treatAxiosError } from "@/app/utils/treatAxiosError";
import { QueryKeys } from "@/app/config/QueryKeys";
import { Transaction } from "@/app/entities/Transaction";
import { transactionService } from "@/app/services/transactionService";
import { useAccounts } from "@/app/hooks/useAccounts";
import { DatePickerInput } from "../components/DatePickerInput";
import { useCategories } from "@/app/hooks/useCategories";
import { useState } from "react";

// ==== Types & Schema ====
export type TransactionType = "INCOME" | "EXPENSE";

const type = Transaction.Type;

const schema = z.object({
  accountId: z.string().min(1, "Conta é obrigatória"),
  categoryId: z.string().min(1, "Categoria é obrigatória"),
  name: z.string().min(1, "Nome é obrigatório"),
  value: z.union([
    z.string().min(1, "Valor é obrigatório"),
    z.number().min(1, "Valor é obrigatório"),
  ]),
  type: z.nativeEnum(Transaction.Type),
  isPaid: z.boolean(),
  date: z.date(), // yyyy-mm-dd vindo do <input type="date" />
  dueDate: z.date().optional(), // idem
  notes: z.string().optional(),
});

export type TransactionFormData = z.infer<typeof schema>;

export interface TransactionModalProps {
  action: "create" | "update";
  isOpen: boolean;
  onClose: () => void;
  // Para edição
  transaction?: Transaction.Attributes;
}

// Util: converte "2025-09-20" -> "2025-09-20T00:00:00.000Z" mantendo meia-noite local para ISO
function toIsoDate(dateStr?: string) {
  if (!dateStr) return undefined;
  const d = new Date(dateStr + "T00:00:00");
  return d.toISOString();
}

export function TransactionModal({
  isOpen,
  onClose,
  action,
  transaction,
}: TransactionModalProps) {
  const { selectedEntityId } = useAuth();
  const queryClient = useQueryClient();
  const [hasDueDate, setHasDueDate] = useState(false);
  const handleHasDueDateChange = (hasDueDate: boolean) => {
    setHasDueDate(!!hasDueDate);
  };
  const { isFetchingAccounts, accounts } = useAccounts({
    entityId: selectedEntityId!,
  });

  const { isFetchingCategories, categories } = useCategories({
    entityId: selectedEntityId!,
  });

  const {
    control,
    register,
    handleSubmit: hookFormHandleSubmit,
    formState: { errors },
    watch,
  } = useForm<TransactionFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      accountId: transaction?.accountId ?? "", // TODO: selecionar conta
      categoryId: transaction?.categoryId ?? "", // TODO: selecionar categoria
      name: transaction?.name ?? "", // TODO: preencher nome
      value: transaction?.value ?? 0,
      type: transaction?.type ?? type.EXPENSE,
      isPaid: transaction?.isPaid ?? false, // TODO: selecionar pago
      date: transaction?.date ? new Date(transaction.date) : new Date(), // TODO: preencher data
      dueDate: transaction?.dueDate ? new Date(transaction.dueDate) : undefined, // TODO: preencher vencimento
      notes: transaction?.notes ?? "", // TODO: preencher notas
    },
  });

  const watchValue = watch("dueDate");
  console.log("watchValue", watchValue);

  const {
    isPending: isLoadingCreateTransaction,
    mutateAsync: mutateAsyncCreateTransaction,
  } = useMutation({
    mutationFn: transactionService.create,
  });

  // TODO: adicionar mutate de update quando existir no service

  const onSubmit = hookFormHandleSubmit(async (data) => {
    try {
      if (action === "create") {
        await mutateAsyncCreateTransaction({
          entityId: selectedEntityId!,
          accountId: data.accountId,
          categoryId: data.categoryId,
          name: data.name,
          value: Number(data.value),
          type: data.type,
          isPaid: data.isPaid,
          date: data.date.toISOString(),
          dueDate: data.dueDate?.toISOString() ?? "",
          notes: data.notes,
        });
        queryClient.invalidateQueries({ queryKey: [QueryKeys.TRANSACTIONS] });
        toast.success("Transação criada com sucesso!");
      }

      if (action === "update") {
        toast.success("Transação atualizada com sucesso!");
      }

      onClose();
    } catch (error) {
      treatAxiosError(error as AxiosError);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {action === "update" ? "Editar Transação" : "Nova Transação"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Valor */}
          <div className="space-y-2">
            <Label>Valor</Label>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 tracking-[-0.5px] text-lg">
                R$
              </span>
              <Controller
                control={control}
                name="value"
                render={({ field: { onChange, value } }) => (
                  <InputCurrency
                    value={value as any}
                    onChange={onChange}
                    error={errors.value?.message}
                  />
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                type="text"
                placeholder="Ex: Aluguel"
                error={errors.name?.message}
                {...register("name")}
              />
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Controller
                control={control}
                name="type"
                render={({ field: { onChange, value } }) => (
                  <Select value={value} onValueChange={onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INCOME">Receita</SelectItem>
                      <SelectItem value="EXPENSE">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type?.message && (
                <p className="text-sm text-red-500">{errors.type.message}</p>
              )}
            </div>

            {/* Conta */}
            <div className="space-y-2">
              <Label>Conta</Label>
              <Controller
                control={control}
                name="accountId"
                render={({ field: { onChange, value } }) => (
                  <Select value={value} onValueChange={onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    {!isFetchingAccounts && (
                      <SelectContent>
                        {accounts!.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id!}>
                            {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    )}
                  </Select>
                )}
              />
              {errors.accountId?.message && (
                <p className="text-sm text-red-500">
                  {errors.accountId.message}
                </p>
              )}
            </div>

            {/* Categoria */}
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field: { onChange, value } }) => (
                  <Select value={value} onValueChange={onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    {!isFetchingCategories && categories && (
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id!}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    )}
                  </Select>
                )}
              />
              {errors.categoryId?.message && (
                <p className="text-sm text-red-500">
                  {errors.categoryId.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 py-2">
            <div className="space-y-0.5">
              <Label>Tem vencimento?</Label>
              <p className="text-sm text-muted-foreground">
                Marque se a transação tem data para vencimento.
              </p>
            </div>
            <Switch
              checked={hasDueDate}
              onCheckedChange={handleHasDueDateChange}
            />
          </div>

          {/* Datas */}
          {/*   <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Controller
                control={control}
                name={`date`}
                render={({ field: { onChange, value } }) => (
                  <DatePickerInput
                    error={errors.date?.message}
                    value={new Date(value)}
                    onChange={onChange}
                  />
                )}
              />
            </div>
            {hasDueDate && (
              <div className="space-y-2">
                <Label>Vencimento (opcional)</Label>
                <Controller
                  control={control}
                  name={`dueDate`}
                  shouldUnregister
                  render={({ field: { onChange, value } }) => (
                    <DatePickerInput
                      error={errors.dueDate?.message}
                      value={value ? new Date(value) : new Date()}
                      onChange={onChange}
                    />
                  )}
                />
              </div>
            )}
          </div>

          {/* Pago? */}
          <div className="flex items-center justify-between gap-4 py-2">
            <div className="space-y-0.5">
              <Label>Pago</Label>
              <p className="text-sm text-muted-foreground">
                Marque se a transação já foi quitada.
              </p>
            </div>
            <Controller
              control={control}
              name="isPaid"
              render={({ field: { onChange, value } }) => (
                <Switch checked={value} onCheckedChange={onChange} />
              )}
            />
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label>Notas</Label>
            <Input
              type="text"
              placeholder="Observações (opcional)"
              {...register("notes")}
            />
          </div>

          {/* Ações */}
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
              isLoading={isLoadingCreateTransaction}
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
