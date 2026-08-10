import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  IconArrowLeft,
  IconBuildingStore,
  IconCalendar,
  IconFileTypePdf,
  IconMapPin,
  IconPackage,
  IconPencil,
  IconPhoto,
  IconReceipt,
  IconTrash,
  IconUser,
} from "@tabler/icons-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { QueryKeys } from "@/app/config/QueryKeys";
import { useAuth } from "@/app/hooks/useAuth";
import { useQuotation } from "@/app/hooks/useQuotation";
import { quotationService } from "@/app/services/quotationService";
import { treatAxiosError } from "@/app/utils/treatAxiosError";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { exportQuotationPdf } from "./exportQuotationPdf";
import {
  formatQuotationCurrency,
  formatQuotationDate,
  formatQuotationQuantity,
  quotationStatusClass,
  quotationStatusLabels,
} from "./quotationPresentation";

export default function QuotationDetails() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { quotationId = "" } = useParams();
  const { selectedEntityId } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const deleteMutation = useMutation({ mutationFn: quotationService.remove });
  const { quotation, isFetchingQuotation, isError, refetch } = useQuotation(
    {
      entityId: selectedEntityId ?? "",
      quotationId,
    },
    Boolean(selectedEntityId && quotationId)
  );

  const handleExport = async () => {
    if (!quotation) return;
    setIsExporting(true);

    try {
      // Refreshes the short-lived private image URLs immediately before export.
      const refreshed = await refetch();
      const source = refreshed.data ?? quotation;
      const filename = await exportQuotationPdf(source);
      toast.success(`PDF gerado: ${filename}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Nao foi possivel gerar o PDF desta cotacao."
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEntityId || !quotation) return;

    try {
      await deleteMutation.mutateAsync({
        entityId: selectedEntityId,
        quotationId: quotation.id,
      });
      queryClient.removeQueries({
        queryKey: [QueryKeys.QUOTATIONS, selectedEntityId, quotation.id],
      });
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.QUOTATIONS, selectedEntityId],
      });
      toast.success(`Cotacao ${quotation.number} excluida.`);
      navigate("/quotations", { replace: true });
    } catch (error) {
      treatAxiosError(error);
    }
  };

  if (isFetchingQuotation && !quotation) {
    return (
      <div className="p-4 lg:p-6">
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            Carregando cotacao...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !quotation) {
    return (
      <div className="p-4 lg:p-6">
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col items-start gap-4 py-10">
            <div>
              <p className="font-semibold">Cotacao nao encontrada</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Confirme a organizacao ativa e tente carregar novamente.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => refetch()}>
                Tentar novamente
              </Button>
              <Button asChild>
                <Link to="/quotations">Voltar para cotacoes</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const imageCount = quotation.items.reduce(
    (total, item) => total + item.images.length,
    0
  );

  return (
    <div className="flex flex-col gap-6 px-4 py-5 lg:px-6 lg:py-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" className="w-fit" asChild>
          <Link to="/quotations">
            <IconArrowLeft />
            Voltar
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to={`/quotations/${quotation.id}/edit`}>
              <IconPencil />
              Editar
            </Link>
          </Button>
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <IconTrash />
            Excluir
          </Button>
          <Button onClick={handleExport} isLoading={isExporting}>
            <IconFileTypePdf />
            Exportar PDF
          </Button>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-2xl border bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.2),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent)] p-5 sm:p-7">
        <IconReceipt className="absolute -bottom-10 -right-6 size-44 text-emerald-400/[0.06]" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
                Proposta comercial
              </p>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${quotationStatusClass(
                  quotation.status
                )}`}
              >
                {quotationStatusLabels[quotation.status]}
              </span>
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Cotacao {quotation.number}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {quotation.customerTradeName || quotation.customerLegalName}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-400/15 bg-background/40 px-5 py-4 md:text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Valor proposto
            </p>
            <p className="mt-1 text-3xl font-semibold text-emerald-300">
              {formatQuotationCurrency(quotation.total)}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Subtotal" value={formatQuotationCurrency(quotation.subtotal)} />
        <Metric label="Frete" value={formatQuotationCurrency(quotation.freight)} />
        <Metric label="Desconto" value={formatQuotationCurrency(quotation.discount)} />
        <Metric
          label="Produtos / imagens"
          value={`${quotation.items.length} / ${imageCount}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconBuildingStore className="size-5 text-emerald-400" />
              Empresa emitente
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <Info label="Nome" value={quotation.sellerName} />
            <Info label="Documento" value={quotation.sellerDocument} />
            <Info label="E-mail" value={quotation.sellerEmail} />
            <Info label="Telefone" value={quotation.sellerPhone} />
            <div className="sm:col-span-2">
              <Info label="Endereco" value={quotation.sellerAddress} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconUser className="size-5 text-sky-400" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <Info label="Razao social" value={quotation.customerLegalName} />
            <Info label="Nome fantasia" value={quotation.customerTradeName} />
            <Info label="Documento" value={quotation.customerDocument} />
            <Info label="Contato" value={[quotation.customerEmail, quotation.customerPhone].filter(Boolean).join(" | ")} />
            <div className="sm:col-span-2">
              <Info label="Endereco" value={quotation.customerAddress} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconCalendar className="size-5 text-emerald-400" />
            Datas e condicoes
          </CardTitle>
          <CardDescription>
            Informacoes comerciais que serao apresentadas no PDF.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Emissao" value={formatQuotationDate(quotation.issuedAt)} />
          <Info label="Validade" value={formatQuotationDate(quotation.validUntil)} />
          <Info label="Pagamento" value={quotation.paymentTerms} />
          <Info label="Entrega" value={quotation.deliveryTerms} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconPackage className="size-5 text-emerald-400" />
            Produtos cotados
          </CardTitle>
          <CardDescription>
            Valores e referencias preservados no momento da criacao.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {quotation.items.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border bg-muted/10 p-4 sm:p-5"
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div className="min-w-0">
                  <div className="flex items-start gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-sm font-semibold text-emerald-400">
                      {item.lineNumber}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold">{item.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[item.productCode, item.brand, item.specification, item.unit]
                          .filter(Boolean)
                          .join(" | ")}
                      </p>
                    </div>
                  </div>
                  {item.notes && (
                    <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                      {item.notes}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-right lg:min-w-[21rem]">
                  <ItemValue label="Quantidade" value={`${formatQuotationQuantity(item.quantity)} ${item.unit}`} />
                  <ItemValue label="Unitario" value={formatQuotationCurrency(item.unitPrice)} />
                  <ItemValue label="Total" value={formatQuotationCurrency(item.total)} highlight />
                </div>
              </div>

              {item.images.length > 0 && (
                <div className="mt-4 border-t pt-4">
                  <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <IconPhoto className="size-4" />
                    Referencias visuais
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:max-w-3xl">
                    {item.images.map((image) => (
                      <a
                        key={image.id}
                        href={image.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group overflow-hidden rounded-xl border bg-background"
                      >
                        <img
                          src={image.url}
                          alt={image.fileName}
                          loading="lazy"
                          className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                        <p className="truncate px-2 py-2 text-xs text-muted-foreground">
                          {image.fileName}
                        </p>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </article>
          ))}
        </CardContent>
      </Card>

      {(quotation.notes || quotation.internalNotes) && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconReceipt className="size-5 text-emerald-400" />
                Observacoes da proposta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Info label="Visivel no PDF" value={quotation.notes} />
            </CardContent>
          </Card>
          {quotation.internalNotes && (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>Observacoes internas</CardTitle>
                <CardDescription>
                  Este conteudo nao e enviado ao cliente.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Info label="Uso interno" value={quotation.internalNotes} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card className="border-dashed bg-emerald-500/[0.03]">
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
              <IconFileTypePdf className="size-6" />
            </div>
            <div>
              <p className="font-semibold">Documento pronto para envio</p>
              <p className="mt-1 text-sm text-muted-foreground">
                O PDF inclui tabela paginada e, quando houver, uma galeria de
                imagens organizada ao final.
              </p>
            </div>
          </div>
          <Button onClick={handleExport} isLoading={isExporting}>
            <IconFileTypePdf />
            Gerar PDF
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir cotacao {quotation.number}?</DialogTitle>
            <DialogDescription>
              Esta acao remove a proposta, seus itens e todas as imagens
              vinculadas. A exclusao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={deleteMutation.isPending}
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              isLoading={deleteMutation.isPending}
              onClick={handleDelete}
            >
              <IconTrash />
              Excluir definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {label === "Endereco" && <IconMapPin className="size-3.5" />}
        {label}
      </p>
      <p className="mt-1 whitespace-pre-line font-medium text-foreground">
        {value || "Nao informado"}
      </p>
    </div>
  );
}

function ItemValue({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl bg-background/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-sm font-semibold ${
          highlight ? "text-emerald-300" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
