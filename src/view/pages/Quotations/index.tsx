import {
  IconArrowRight,
  IconCalendarEvent,
  IconFileInvoice,
  IconPhoto,
  IconPlus,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { useDeferredValue, useState } from "react";
import { Link } from "react-router-dom";

import type { QuotationStatus } from "@/app/entities/Quotation";
import { useAuth } from "@/app/hooks/useAuth";
import { useQuotations } from "@/app/hooks/useQuotations";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatQuotationCurrency,
  formatQuotationDate,
  quotationStatusClass,
  quotationStatusLabels,
} from "./quotationPresentation";

type StatusFilter = QuotationStatus | "ALL";

export default function Quotations() {
  const { activeEntity, selectedEntityId } = useAuth();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<StatusFilter>("ALL");

  const { quotations, isFetchingQuotations, isError, refetch } =
    useQuotations(
      {
        entityId: selectedEntityId ?? "",
        search: deferredSearch.trim() || undefined,
        status: status === "ALL" ? undefined : status,
      },
      Boolean(selectedEntityId)
    );

  const resultTotal =
    quotations?.reduce((total, quotation) => total + quotation.total, 0) ?? 0;
  const hasFilters = Boolean(search.trim()) || status !== "ALL";

  const clearFilters = () => {
    setSearch("");
    setStatus("ALL");
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-5 lg:px-6 lg:py-7">
      <section className="relative overflow-hidden rounded-2xl border bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.2),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent)] p-5 sm:p-7">
        <div className="absolute -right-10 -top-16 size-52 rounded-full border border-emerald-400/10" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
              Propostas comerciais
            </p>
            <h2 className="text-3xl font-semibold tracking-tight">Cotacoes</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Prepare precos, condicoes e imagens dos produtos antes da
              confirmacao do cliente virar uma ordem de compra.
            </p>
          </div>
          <Button size="lg" className="w-full md:w-auto" asChild>
            <Link to="/quotations/new">
              <IconPlus />
              Nova cotacao
            </Link>
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
            <CardDescription>Cotacoes no resultado</CardDescription>
            <CardTitle className="text-3xl text-emerald-400">
              {quotations?.length ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="gap-3">
          <CardHeader>
            <CardDescription>Valor total no resultado</CardDescription>
            <CardTitle className="text-2xl">
              {formatQuotationCurrency(resultTotal)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-3 rounded-2xl border bg-card/40 p-4 md:grid-cols-[minmax(0,1fr)_14rem_auto]">
        <div className="relative">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por numero ou cliente"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as StatusFilter)}
        >
          <SelectTrigger aria-label="Situacao da cotacao">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Situacao: todas</SelectItem>
            {Object.entries(quotationStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="ghost"
          disabled={!hasFilters}
          onClick={clearFilters}
        >
          <IconX />
          Limpar
        </Button>
      </div>

      {isFetchingQuotations && (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Carregando cotacoes...
          </CardContent>
        </Card>
      )}

      {isError && (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col items-start gap-3 py-8">
            <p className="font-medium">Nao foi possivel carregar as cotacoes.</p>
            <Button variant="outline" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {!isFetchingQuotations && !isError && !quotations?.length && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="rounded-2xl bg-emerald-500/10 p-4 text-emerald-400">
              <IconFileInvoice className="size-9" />
            </div>
            <div>
              <p className="font-semibold">
                {hasFilters
                  ? "Nenhuma cotacao corresponde aos filtros"
                  : "Nenhuma cotacao cadastrada"}
              </p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                {hasFilters
                  ? "Altere os criterios para visualizar outras propostas."
                  : "Crie a primeira proposta comercial com produtos, valores e imagens opcionais."}
              </p>
            </div>
            {hasFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                <IconX />
                Limpar filtros
              </Button>
            ) : (
              <Button asChild>
                <Link to="/quotations/new">
                  <IconPlus />
                  Criar primeira cotacao
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {quotations?.map((quotation) => (
          <Card
            key={quotation.id}
            className="group gap-0 overflow-hidden py-0 transition-colors hover:border-emerald-500/25 hover:bg-muted/10"
          >
            <CardContent className="p-0">
              <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(10rem,0.6fr)_minmax(11rem,0.65fr)_minmax(10rem,0.55fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-base font-semibold sm:text-lg">
                      Cotacao {quotation.number}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${quotationStatusClass(
                        quotation.status
                      )}`}
                    >
                      {quotationStatusLabels[quotation.status]}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {quotation.customerTradeName || quotation.customerLegalName}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {quotation.customerDocument}
                  </p>
                </div>

                <div className="rounded-xl bg-muted/30 p-3 lg:bg-transparent lg:p-0">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <IconCalendarEvent className="size-3.5" />
                    Emissao / validade
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {formatQuotationDate(quotation.issuedAt)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatQuotationDate(quotation.validUntil)}
                  </p>
                </div>

                <div className="rounded-xl bg-muted/30 p-3 lg:bg-transparent lg:p-0">
                  <p className="text-xs text-muted-foreground">
                    {quotation.itemCount}{" "}
                    {quotation.itemCount === 1 ? "produto" : "produtos"}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <IconPhoto className="size-3.5" />
                    {quotation.imageCount > 0
                      ? `${quotation.imageCount} imagens`
                      : "Sem imagens"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Valor proposto</p>
                  <p className="mt-1 text-lg font-semibold text-emerald-300">
                    {formatQuotationCurrency(quotation.total)}
                  </p>
                </div>

                <Button variant="outline" className="w-full lg:w-auto" asChild>
                  <Link to={`/quotations/${quotation.id}`}>
                    Abrir
                    <IconArrowRight />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
