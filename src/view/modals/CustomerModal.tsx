import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { QueryKeys } from "@/app/config/QueryKeys";
import type { Customer } from "@/app/entities/Customer";
import { useAuth } from "@/app/hooks/useAuth";
import { customerService } from "@/app/services/customerService";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const customerSchema = z.object({
  legalName: z.string().trim().min(1, "Informe a razao social.").max(160),
  tradeName: z.string().trim().max(160),
  document: z.string().trim().min(1, "Informe o documento.").max(40),
  email: z
    .string()
    .trim()
    .email("Informe um e-mail valido.")
    .or(z.literal("")),
  phone: z.string().trim().max(40),
  billingAddress: z.string().trim().max(2000),
  deliveryAddress: z.string().trim().max(2000),
  notes: z.string().trim().max(4000),
  active: z.boolean(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

const emptyCustomer: CustomerFormData = {
  legalName: "",
  tradeName: "",
  document: "",
  email: "",
  phone: "",
  billingAddress: "",
  deliveryAddress: "",
  notes: "",
  active: true,
};

type CustomerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
};

export function CustomerModal({
  isOpen,
  onClose,
  customer,
}: CustomerModalProps) {
  const { selectedEntityId } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = Boolean(customer);

  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: emptyCustomer,
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    reset(
      customer
        ? {
            legalName: customer.legalName,
            tradeName: customer.tradeName ?? "",
            document: customer.document,
            email: customer.email ?? "",
            phone: customer.phone ?? "",
            billingAddress: customer.billingAddress ?? "",
            deliveryAddress: customer.deliveryAddress ?? "",
            notes: customer.notes ?? "",
            active: customer.active,
          }
        : emptyCustomer
    );
  }, [customer, isOpen, reset]);

  const createMutation = useMutation({ mutationFn: customerService.create });
  const updateMutation = useMutation({ mutationFn: customerService.update });

  const onSubmit = handleSubmit(async (formData) => {
    if (!selectedEntityId) {
      return;
    }

    try {
      if (customer) {
        await updateMutation.mutateAsync({
          entityId: selectedEntityId,
          customerId: customer.id,
          legalName: formData.legalName,
          tradeName: formData.tradeName || null,
          document: formData.document,
          email: formData.email || null,
          phone: formData.phone || null,
          billingAddress: formData.billingAddress || null,
          deliveryAddress: formData.deliveryAddress || null,
          notes: formData.notes || null,
          active: formData.active,
        });
        toast.success("Cliente atualizado.");
      } else {
        await createMutation.mutateAsync({
          entityId: selectedEntityId,
          legalName: formData.legalName,
          tradeName: formData.tradeName || undefined,
          document: formData.document,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          billingAddress: formData.billingAddress || undefined,
          deliveryAddress: formData.deliveryAddress || undefined,
          notes: formData.notes || undefined,
          active: formData.active,
        });
        toast.success("Cliente criado.");
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.CUSTOMERS, selectedEntityId],
        }),
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.PURCHASE_ORDERS, selectedEntityId],
        }),
      ]);
      onClose();
    } catch (error) {
      treatAxiosError(error);
    }
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar cliente" : "Novo cliente"}
          </DialogTitle>
          <DialogDescription>
            Cadastre a unidade compradora que emite as ordens. Os enderecos
            servem como base e serao copiados para cada nova ordem.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="customer-legal-name">Razao social</Label>
              <Input
                id="customer-legal-name"
                placeholder="Hospital Exemplo S.A."
                error={errors.legalName?.message}
                {...register("legalName")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-trade-name">Nome fantasia</Label>
              <Input
                id="customer-trade-name"
                placeholder="Hospital Exemplo"
                error={errors.tradeName?.message}
                {...register("tradeName")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-document">CNPJ ou documento</Label>
              <Input
                id="customer-document"
                placeholder="00.000.000/0001-00"
                error={errors.document?.message}
                {...register("document")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-email">E-mail</Label>
              <Input
                id="customer-email"
                type="email"
                placeholder="compras@cliente.com.br"
                error={errors.email?.message}
                {...register("email")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-phone">Telefone</Label>
              <Input
                id="customer-phone"
                placeholder="(00) 0000-0000"
                error={errors.phone?.message}
                {...register("phone")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-billing-address">
                Endereco de faturamento
              </Label>
              <Textarea
                id="customer-billing-address"
                placeholder="Endereco completo para faturamento"
                {...register("billingAddress")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-delivery-address">
                Endereco de entrega
              </Label>
              <Textarea
                id="customer-delivery-address"
                placeholder="Endereco completo para entrega"
                {...register("deliveryAddress")}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="customer-notes">Observacoes</Label>
              <Textarea
                id="customer-notes"
                placeholder="Contatos, horarios ou orientacoes internas"
                {...register("notes")}
              />
            </div>
          </div>

          <Controller
            control={control}
            name="active"
            render={({ field }) => (
              <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-4">
                <div>
                  <p className="text-sm font-medium">Cliente ativo</p>
                  <p className="text-xs text-muted-foreground">
                    Clientes inativos permanecem no historico, mas nao recebem
                    novas ordens.
                  </p>
                </div>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={
                createMutation.isPending || updateMutation.isPending
              }
            >
              {isEditing ? "Salvar alteracoes" : "Criar cliente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
