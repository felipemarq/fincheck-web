import { zodResolver } from "@hookform/resolvers/zod";
import { IconCreditCard } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { QueryKeys } from "@/app/config/QueryKeys";
import type { CreditCard } from "@/app/entities/CreditCard";
import { useAuth } from "@/app/hooks/useAuth";
import { creditCardService } from "@/app/services/creditCardService";
import { treatAxiosError } from "@/app/utils/treatAxiosError";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { InputCurrency } from "@/view/components/InputCurrency";

const schema = z.object({
  name: z.string().trim().min(1, "Informe um nome para identificar o cartao.").max(120),
  holderName: z.string().trim().min(1, "Informe o titular.").max(160),
  bank: z.string().trim().min(1, "Informe o banco ou emissor.").max(120),
  brand: z.enum(["VISA", "MASTERCARD", "ELO", "AMEX", "HIPERCARD", "OTHER"]),
  lastFour: z.string().regex(/^\d{4}$/, "Informe exatamente os quatro ultimos digitos."),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  closingDay: z.number().int().min(1).max(31),
  dueDay: z.number().int().min(1).max(31),
  creditLimit: z.number().nonnegative(),
  active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

function initialValues(card?: CreditCard | null): FormData {
  return {
    name: card?.name ?? "",
    holderName: card?.holderName ?? "",
    bank: card?.bank ?? "",
    brand: card?.brand ?? "VISA",
    lastFour: card?.lastFour ?? "",
    color: card?.color ?? "#10b981",
    closingDay: card?.closingDay ?? 25,
    dueDay: card?.dueDay ?? 5,
    creditLimit: card?.creditLimit ?? 0,
    active: card?.active ?? true,
  };
}

export function CreditCardModal({ isOpen, onClose, card, onSaved }: {
  isOpen: boolean;
  onClose: () => void;
  card?: CreditCard | null;
  onSaved?: (card: CreditCard) => void;
}) {
  const { selectedEntityId } = useAuth();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof creditCardService.create>[0]) =>
      card
        ? creditCardService.update({
            ...input,
            creditCardId: card.id,
          })
        : creditCardService.create(input),
  });
  const { control, handleSubmit, register, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues(card),
  });

  useEffect(() => {
    if (isOpen) reset(initialValues(card));
  }, [card, isOpen, reset]);

  const submit = handleSubmit(async (values) => {
    if (!selectedEntityId) return;
    try {
      const saved = await mutation.mutateAsync({
        ...values,
        creditLimit:
          values.creditLimit > 0 ? values.creditLimit : card ? null : undefined,
        entityId: selectedEntityId,
      });
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.CREDIT_CARDS, selectedEntityId] });
      toast.success(card ? "Cartao atualizado." : "Cartao cadastrado.");
      onSaved?.(saved);
      onClose();
    } catch (error) {
      treatAxiosError(error);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconCreditCard className="size-5 text-emerald-400" />
            {card ? "Editar cartao" : "Novo cartao"}
          </DialogTitle>
          <DialogDescription>
            Salve somente dados de identificacao. Nunca informe numero completo ou CVV.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do cartao" error={errors.name?.message}>
              <Input placeholder="Ex.: Nubank Felipe" {...register("name")} />
            </Field>
            <Field label="Banco ou emissor" error={errors.bank?.message}>
              <Input placeholder="Ex.: Nubank" {...register("bank")} />
            </Field>
            <Field label="Titular" error={errors.holderName?.message}>
              <Input placeholder="Nome impresso no cartao" {...register("holderName")} />
            </Field>
            <Field label="Ultimos 4 digitos" error={errors.lastFour?.message}>
              <Input inputMode="numeric" maxLength={4} placeholder="1234" {...register("lastFour")} />
            </Field>
            <Field label="Bandeira">
              <Controller control={control} name="brand" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VISA">Visa</SelectItem>
                    <SelectItem value="MASTERCARD">Mastercard</SelectItem>
                    <SelectItem value="ELO">Elo</SelectItem>
                    <SelectItem value="AMEX">American Express</SelectItem>
                    <SelectItem value="HIPERCARD">Hipercard</SelectItem>
                    <SelectItem value="OTHER">Outra</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </Field>
            <Field label="Cor de identificacao">
              <div className="flex gap-2">
                <Controller control={control} name="color" render={({ field }) => (
                  <Input type="color" className="w-16 p-1" value={field.value} onChange={field.onChange} />
                )} />
                <Controller control={control} name="color" render={({ field }) => (
                  <Input value={field.value} onChange={field.onChange} />
                )} />
              </div>
            </Field>
            <Field label="Dia de fechamento" error={errors.closingDay?.message}>
              <Input type="number" min={1} max={31} {...register("closingDay", { valueAsNumber: true })} />
            </Field>
            <Field label="Dia de vencimento" error={errors.dueDay?.message}>
              <Input type="number" min={1} max={31} {...register("dueDay", { valueAsNumber: true })} />
            </Field>
            <Field label="Limite (opcional)">
              <Controller control={control} name="creditLimit" render={({ field }) => (
                <InputCurrency variant="field" value={field.value} onChange={field.onChange} />
              )} />
            </Field>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <Label>Cartao ativo</Label>
                <p className="mt-1 text-xs text-muted-foreground">Disponivel para novas compras.</p>
              </div>
              <Controller control={control} name="active" render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )} />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" isLoading={mutation.isPending}>Salvar cartao</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
