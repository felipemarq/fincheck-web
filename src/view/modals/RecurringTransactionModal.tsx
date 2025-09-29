import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import { useMemo } from "react";

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

import { InputCurrency } from "../components/InputCurrency";
import { DatePickerInput } from "../components/DatePickerInput";
import { useAuth } from "@/app/hooks/useAuth";
import { treatAxiosError } from "@/app/utils/treatAxiosError";
import { QueryKeys } from "@/app/config/QueryKeys";
import { useAccounts } from "@/app/hooks/useAccounts";
import { useCategories } from "@/app/hooks/useCategories";

// ==== Tipos base (reutilizando os teus) ====
import { Transaction } from "@/app/entities/Transaction";
import { RecurringTransaction } from "@/app/entities/RecurringTransaction";
import { recurringTransactionsService } from "@/app/services/recurringTransactions";

export interface RecurringTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: "create" | "update";
}

// ==== Zod schema (espelha o backend) ====
const schema = z
  .object({
    accountId: z.string().min(1, "Conta é obrigatória"),
    categoryId: z.string().min(1, "Categoria é obrigatória"),
    name: z
      .string()
      .min(1, "Nome é obrigatório")
      .max(120, "Máx. 120 caracteres"),
    value: z.union([
      z.string().min(1, "Valor é obrigatório"),
      z.number().positive("Valor deve ser maior que zero"),
    ]),
    type: z.nativeEnum(Transaction.Type, "Tipo é obrigatório"),

    startDate: z.date("Data de início é obrigatória"),
    endDate: z.date("Data de término é obrigatória"),

    recurrence: z.nativeEnum(
      RecurringTransaction.Recurrence,
      "Recorrência é obrigatória"
    ),

    notes: z.string().max(500, "Observações até 500 caracteres").optional(),

    // opcionais
    creditCardId: z.string().uuid().optional(),
    contactId: z.string().uuid().optional(),
  })
  .refine((d) => !d.startDate || !d.endDate || d.endDate >= d.startDate, {
    message: "Término não pode ser anterior ao início",
    path: ["endDate"],
  });

export type RecurringFormData = z.infer<typeof schema>;

export function RecurringTransactionModal({
  isOpen,
  onClose,
}: RecurringTransactionModalProps) {
  const { selectedEntityId } = useAuth();
  const queryClient = useQueryClient();

  // data base
  const { accounts, isFetchingAccounts } = useAccounts({
    entityId: selectedEntityId!,
  });
  const { categories, isFetchingCategories } = useCategories({
    entityId: selectedEntityId!,
  });

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RecurringFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      accountId: "",
      categoryId: "",
      name: "",
      value: 0,
      type: Transaction.Type.EXPENSE,
      startDate: new Date(),
      endDate: new Date(),
      recurrence: "MONTHLY" as RecurringTransaction.Recurrence,
      notes: "",
    },
  });

  const type = watch("type");

  // filtra categorias pelo tipo selecionado (coerente com teu domínio)
  const filteredCategories = useMemo(
    () => (categories ?? []).filter((c) => c.type === type),
    [categories, type]
  );

  const { isPending: isLoadingCreate, mutateAsync: createRecurring } =
    useMutation({
      mutationFn: async (form: RecurringFormData) => {
        return recurringTransactionsService.create({
          entityId: selectedEntityId!,
          accountId: form.accountId,
          categoryId: form.categoryId,
          name: form.name,
          value: Number(form.value),
          type: form.type,
          startDate: form.startDate.toISOString(),
          endDate: form.endDate.toISOString(),
          recurrence: form.recurrence,
          notes: form.notes,
          creditCardId: form.creditCardId,
          contactId: form.contactId,
        });
      },
    });

  const onSubmit = handleSubmit(async (data) => {
    try {
      await createRecurring(data);

      // invalida listas relevantes (ajuste se tiver outras keys)
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.RECURRING_TRANSACTIONS],
      });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.TRANSACTIONS] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.DASHBOARD] });

      toast.success("Recorrência criada com sucesso!");
      onClose();
    } catch (err) {
      treatAxiosError(err as AxiosError);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova transação recorrente</DialogTitle>
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

          {/* Nome / Tipo / Recorrência */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Nome</Label>
              <Input
                type="text"
                placeholder="Ex: Aluguel, Salário, Netflix..."
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        {accounts?.map((acc) => (
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

            {/* Categoria (filtrada por tipo) */}
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
                    {!isFetchingCategories && (
                      <SelectContent>
                        {filteredCategories.map((cat) => (
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

            {/* Recorrência */}
            <div className="space-y-2">
              <Label>Recorrência</Label>
              <Controller
                control={control}
                name="recurrence"
                render={({ field: { onChange, value } }) => (
                  <Select value={value} onValueChange={onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Recorrência" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Diária</SelectItem>
                      <SelectItem value="WEEKLY">Semanal</SelectItem>
                      <SelectItem value="MONTHLY">Mensal</SelectItem>
                      <SelectItem value="YEARLY">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.recurrence?.message && (
                <p className="text-sm text-red-500">
                  {errors.recurrence.message}
                </p>
              )}
            </div>
          </div>

          {/* Período (início/fim) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Início</Label>
              <Controller
                control={control}
                name="startDate"
                render={({ field: { onChange, value } }) => (
                  <DatePickerInput
                    value={new Date(value)}
                    onChange={onChange}
                    error={errors.startDate?.message}
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Término</Label>
              <Controller
                control={control}
                name="endDate"
                render={({ field: { onChange, value } }) => (
                  <DatePickerInput
                    value={new Date(value)}
                    onChange={onChange}
                    error={errors.endDate?.message}
                  />
                )}
              />
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label>Notas</Label>
            <Input
              type="text"
              placeholder="Observações (opcional)"
              {...register("notes")}
            />
            {errors.notes?.message && (
              <p className="text-sm text-red-500">{errors.notes.message}</p>
            )}
          </div>

          {/* Avançado (opcional): cartão/contato
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cartão de crédito (opcional)</Label>
              <Controller
                control={control}
                name="creditCardId"
                render={({ field: { onChange, value } }) => (
                  <Select value={value} onValueChange={onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecionar cartão" />
                    </SelectTrigger>
                    <SelectContent>
                      // TODO: listar cartões do usuário (hook useCreditCards)
                      <SelectItem value="...">...</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Contato (opcional)</Label>
              <Controller
                control={control}
                name="contactId"
                render={({ field: { onChange, value } }) => (
                  <Select value={value} onValueChange={onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecionar contato" />
                    </SelectTrigger>
                    <SelectContent>
                      // TODO: listar contatos (hook useContacts)
                      <SelectItem value="...">...</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          */}

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
              isLoading={isLoadingCreate}
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
