import { useDeferredValue, useState } from "react";
import {
  IconBuildingHospital,
  IconMapPin,
  IconPencil,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";

import type { Customer } from "@/app/entities/Customer";
import { useAuth } from "@/app/hooks/useAuth";
import { useCustomers } from "@/app/hooks/useCustomers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CustomerModal } from "@/view/modals/CustomerModal";

export default function Customers() {
  const { activeEntity, selectedEntityId } = useAuth();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerBeingEdited, setCustomerBeingEdited] =
    useState<Customer | null>(null);

  const { customers, isFetchingCustomers, isError, refetch } = useCustomers(
    {
      entityId: selectedEntityId ?? "",
      search: deferredSearch || undefined,
    },
    Boolean(selectedEntityId)
  );

  const activeCustomers =
    customers?.filter((customer) => customer.active).length ?? 0;

  const closeModal = () => {
    setIsModalOpen(false);
    setCustomerBeingEdited(null);
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-5 lg:px-6 lg:py-7">
      <section className="relative overflow-hidden rounded-2xl border bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent)] p-5 sm:p-7">
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
              Base comercial
            </p>
            <h2 className="text-3xl font-semibold tracking-tight">
              Clientes da operacao
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Cada unidade compradora possui seu proprio documento e enderecos.
              A ordem preserva uma copia desses dados para manter o historico.
            </p>
          </div>
          <Button
            size="lg"
            className="w-full md:w-auto"
            onClick={() => setIsModalOpen(true)}
          >
            <IconPlus />
            Novo cliente
          </Button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="gap-3">
          <CardHeader>
            <CardDescription>Organizacao ativa</CardDescription>
            <CardTitle>{activeEntity?.name ?? "Nenhuma"}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="gap-3">
          <CardHeader>
            <CardDescription>Clientes cadastrados</CardDescription>
            <CardTitle className="text-3xl">{customers?.length ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="gap-3">
          <CardHeader>
            <CardDescription>Disponiveis para novas ordens</CardDescription>
            <CardTitle className="text-3xl text-emerald-400">
              {activeCustomers}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="relative max-w-xl">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por razao social, nome ou documento"
          className="pl-9"
        />
      </div>

      {isFetchingCustomers && (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Carregando clientes...
          </CardContent>
        </Card>
      )}

      {isError && (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col items-start gap-3 py-8">
            <p className="font-medium">Nao foi possivel carregar os clientes.</p>
            <Button variant="outline" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {!isFetchingCustomers && !isError && !customers?.length && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <div className="rounded-2xl bg-emerald-500/10 p-4 text-emerald-400">
              <IconBuildingHospital className="size-8" />
            </div>
            <div>
              <p className="font-semibold">Nenhum cliente encontrado</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Cadastre a primeira unidade compradora para criar uma ordem.
              </p>
            </div>
            <Button onClick={() => setIsModalOpen(true)}>
              <IconPlus />
              Criar primeiro cliente
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {customers?.map((customer) => (
          <Card
            key={customer.id}
            className="group gap-4 overflow-hidden transition-transform duration-200 hover:-translate-y-0.5"
          >
            <div
              className={
                customer.active
                  ? "h-1 bg-emerald-400"
                  : "h-1 bg-muted-foreground/30"
              }
            />
            <CardHeader className="pt-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardDescription>
                    {customer.tradeName || customer.document}
                  </CardDescription>
                  <CardTitle className="mt-1 truncate">
                    {customer.legalName}
                  </CardTitle>
                </div>
                <span
                  className={
                    customer.active
                      ? "rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400"
                      : "rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                  }
                >
                  {customer.active ? "Ativo" : "Inativo"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Documento: {customer.document}</p>
                <p>{customer.email || "E-mail nao informado"}</p>
                <div className="flex items-start gap-2">
                  <IconMapPin className="mt-0.5 size-4 shrink-0" />
                  <span className="line-clamp-2">
                    {customer.deliveryAddress ||
                      "Endereco de entrega nao informado"}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setCustomerBeingEdited(customer)}
              >
                <IconPencil />
                Editar cliente
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <CustomerModal
        isOpen={isModalOpen || Boolean(customerBeingEdited)}
        onClose={closeModal}
        customer={customerBeingEdited}
      />
    </div>
  );
}
