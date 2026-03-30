import * as React from "react";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/view/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/view/components/ui/dropdown-menu";
import { Input } from "@/view/components/ui/input";
import { Label } from "@/view/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/view/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/view/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/view/components/ui/separator";
import { useRecurringTransactions } from "@/app/hooks/useRecurringTransactions";
import { useAccounts } from "@/app/hooks/useAccounts";
import { useCategories } from "@/app/hooks/useCategories";
import { QueryKeys } from "@/app/config/QueryKeys";
import { recurringTransactionsService } from "@/app/services/recurringTransactions";
import type {
  ListRecurringTransactionsParams,
  RecurringTransactionDTO,
} from "@/app/services/recurringTransactions/getAll";
import { RecurringTransactionModal } from "@/view/modals/RecurringTransactionModal";
import { TRANSACTION_TYPE_LABELS_PT } from "@/view/i18n/pt/transaction";
import { treatAxiosError } from "@/app/utils/treatAxiosError";
import type { AxiosError } from "axios";

const RECURRENCE_LABELS: Record<RecurringTransactionDTO["recurrence"], string> =
  {
    DAILY: "Diária",
    WEEKLY: "Semanal",
    MONTHLY: "Mensal",
    YEARLY: "Anual",
  };

function formatMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateIso(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

type LocalFilters = {
  search?: string;
  types: RecurringTransactionDTO["type"][];
  recurrence: RecurringTransactionDTO["recurrence"][];
  startDate?: string;
  endDate?: string;
  minValue?: string;
  sortBy?: ListRecurringTransactionsParams["sortBy"];
  sortDir?: ListRecurringTransactionsParams["sortDir"];
  pageSize: number;
};

const DEFAULT_LOCAL: LocalFilters = {
  search: "",
  types: [],
  recurrence: [],
  sortBy: "startDate",
  sortDir: "desc",
  pageSize: 10,
};

export function RecurringTransactionsTable({
  entityId,
  enabled = true,
}: {
  entityId: string;
  enabled?: boolean;
}) {
  const [local, setLocal] = React.useState<LocalFilters>(DEFAULT_LOCAL);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [recurringTransactionToDelete, setRecurringTransactionToDelete] =
    React.useState<RecurringTransactionDTO | null>(null);
  const [recurringTransactionToEdit, setRecurringTransactionToEdit] =
    React.useState<RecurringTransactionDTO | null>(null);
  const [isEditRecurringModalOpen, setIsEditRecurringModalOpen] =
    React.useState(false);

  const queryClient = useQueryClient();

  const { accounts } = useAccounts({ entityId });
  const { categories } = useCategories({ entityId });

  const accountMap = React.useMemo(() => {
    const map = new Map<string, string>();
    accounts?.forEach((account) => map.set(account.id!, account.name));
    return map;
  }, [accounts]);

  const categoryMap = React.useMemo(() => {
    const map = new Map<string, string>();
    categories?.forEach((category) => map.set(category.id!, category.name));
    return map;
  }, [categories]);

  const apiFilters: ListRecurringTransactionsParams = React.useMemo(
    () => ({
      entityId,
      type: local.types.length ? local.types : undefined,
      recurrence: local.recurrence.length ? local.recurrence : undefined,
      startDate: local.startDate,
      endDate: local.endDate,
      value: local.minValue ? Number(local.minValue) : undefined,
      sortBy: local.sortBy,
      sortDir: local.sortDir,
      page: pageIndex + 1,
      pageSize: local.pageSize,
      search: local.search?.trim() || undefined,
    }),
    [entityId, local, pageIndex],
  );

  const { recurringTransactions, isFetchingRecurringTransactions } =
    useRecurringTransactions(apiFilters, enabled);

  const items = recurringTransactions?.items ?? [];
  const total = recurringTransactions?.total ?? 0;
  const pageSize = recurringTransactions?.pageSize ?? local.pageSize;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const {
    isPending: isRemovingRecurring,
    mutateAsync: removeRecurringTransaction,
  } = useMutation({
    mutationFn: recurringTransactionsService.remove,
  });

  const onDeleteRecurringTransaction = async () => {
    if (!recurringTransactionToDelete) return;
    try {
      await removeRecurringTransaction({
        recurringTransactionId: recurringTransactionToDelete.id,
        entityId,
      });
      toast.success("Recorrência excluída com sucesso!");
      setIsDeleteModalOpen(false);
      setRecurringTransactionToDelete(null);
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.RECURRING_TRANSACTIONS],
      });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.DASHBOARD] });
    } catch (error: any | typeof AxiosError) {
      treatAxiosError(error);
    }
  };

  const openDeleteModal = (item: RecurringTransactionDTO) => {
    setRecurringTransactionToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const openEditModal = (item: RecurringTransactionDTO) => {
    setRecurringTransactionToEdit(item);
    setIsEditRecurringModalOpen(true);
  };

  const closeEditModal = () => {
    setRecurringTransactionToEdit(null);
    setIsEditRecurringModalOpen(false);
  };

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setPageIndex(0);
  }

  return (
    <div className="w-full flex-col gap-4">
      <div className="flex flex-col gap-3 px-4 lg:px-6 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={applySearch} className="flex items-center gap-2">
            <div className="relative">
              <IconSearch className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
              <Input
                className="w-56 pl-8"
                placeholder="Buscar por nome…"
                value={local.search || ""}
                onChange={(e) =>
                  setLocal((s) => ({ ...s, search: e.target.value }))
                }
              />
            </div>
            <Button type="submit" variant="outline" size="sm">
              Buscar
            </Button>
          </form>

          <Separator orientation="vertical" className="hidden h-6 lg:block" />

          <Select
            value={local.types[0] ?? "-"}
            onValueChange={(v) => {
              setLocal((s) => ({
                ...s,
                types:
                  v === "-" ? [] : ([v] as RecurringTransactionDTO["type"][]),
              }));
              setPageIndex(0);
            }}
          >
            <SelectTrigger className="w-44" size="sm">
              <SelectValue placeholder="Tipo (todos)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-">Todos</SelectItem>
              <SelectItem value="INCOME">Receitas</SelectItem>
              <SelectItem value="EXPENSE">Despesas</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={local.recurrence[0] ?? "-"}
            onValueChange={(v) => {
              setLocal((s) => ({
                ...s,
                recurrence:
                  v === "-"
                    ? []
                    : ([v] as RecurringTransactionDTO["recurrence"][]),
              }));
              setPageIndex(0);
            }}
          >
            <SelectTrigger className="w-40" size="sm">
              <SelectValue placeholder="Recorrência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-">Todas</SelectItem>
              <SelectItem value="DAILY">Diária</SelectItem>
              <SelectItem value="WEEKLY">Semanal</SelectItem>
              <SelectItem value="MONTHLY">Mensal</SelectItem>
              <SelectItem value="YEARLY">Anual</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={local.sortBy}
            onValueChange={(v) => {
              setLocal((s) => ({ ...s, sortBy: v as LocalFilters["sortBy"] }));
              setPageIndex(0);
            }}
          >
            <SelectTrigger className="w-40" size="sm">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="startDate">Início</SelectItem>
              <SelectItem value="endDate">Término</SelectItem>
              <SelectItem value="createdAt">Criado em</SelectItem>
              <SelectItem value="value">Valor</SelectItem>
              <SelectItem value="name">Nome</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={local.sortDir}
            onValueChange={(v) => {
              setLocal((s) => ({ ...s, sortDir: v as "asc" | "desc" }));
              setPageIndex(0);
            }}
          >
            <SelectTrigger className="w-28" size="sm">
              <SelectValue placeholder="Direção" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Asc</SelectItem>
              <SelectItem value="desc">Desc</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Label className="text-sm">Linhas</Label>
            <Select
              value={`${local.pageSize}`}
              onValueChange={(v) => {
                const n = Number(v);
                setLocal((s) => ({ ...s, pageSize: n }));
                setPageIndex(0);
              }}
            >
              <SelectTrigger className="w-20" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((n) => (
                  <SelectItem key={n} value={`${n}`}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={local.startDate?.slice(0, 10) || ""}
            onChange={(e) => {
              setLocal((s) => ({
                ...s,
                startDate: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : undefined,
              }));
              setPageIndex(0);
            }}
            className="w-40"
            placeholder="Início"
          />
          <Input
            type="date"
            value={local.endDate?.slice(0, 10) || ""}
            onChange={(e) => {
              setLocal((s) => ({
                ...s,
                endDate: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : undefined,
              }));
              setPageIndex(0);
            }}
            className="w-40"
            placeholder="Fim"
          />
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={local.minValue ?? ""}
            onChange={(e) => {
              setLocal((s) => ({ ...s, minValue: e.target.value }));
              setPageIndex(0);
            }}
            className="w-32"
            placeholder="Min R$"
          />
        </div>
      </div>

      <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Tipo</TableHead>
                <TableHead>Recorrência</TableHead>
                <TableHead className="hidden md:table-cell">Início</TableHead>
                <TableHead className="hidden lg:table-cell">Término</TableHead>
                <TableHead className="hidden lg:table-cell">Conta</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Categoria
                </TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length ? (
                items.map((item) => {
                  const value =
                    item.type === "EXPENSE"
                      ? -Math.abs(item.value)
                      : Math.abs(item.value);
                  const valueClass =
                    item.type === "EXPENSE" ? "text-red-600" : "text-green-600";
                  const typeClass =
                    item.type === "INCOME"
                      ? "border-green-500 text-green-600"
                      : "border-red-500 text-red-600";

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge
                          variant="outline"
                          className={`px-1.5 ${typeClass}`}
                        >
                          {TRANSACTION_TYPE_LABELS_PT[item.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {RECURRENCE_LABELS[item.recurrence]}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {formatDateIso(item.startDate)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {formatDateIso(item.endDate)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {accountMap.get(item.accountId) ?? "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {categoryMap.get(item.categoryId) ?? "—"}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${valueClass}`}
                      >
                        {formatMoney(value)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                              size="icon"
                            >
                              <IconDotsVertical />
                              <span className="sr-only">Menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={() => openEditModal(item)}
                            >
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => openDeleteModal(item)}
                            >
                              <IconTrash className="mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    {isFetchingRecurringTransactions
                      ? "Carregando..."
                      : "Sem resultados."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between px-2 lg:px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            Total de {total} recorrências
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Página {pageIndex + 1} de {pageCount}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => setPageIndex(0)}
                disabled={pageIndex === 0}
              >
                <span className="sr-only">Primeira</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                disabled={pageIndex === 0}
              >
                <span className="sr-only">Anterior</span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() =>
                  setPageIndex((p) => Math.min(pageCount - 1, p + 1))
                }
                disabled={pageIndex >= pageCount - 1}
              >
                <span className="sr-only">Próxima</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => setPageIndex(pageCount - 1)}
                disabled={pageIndex >= pageCount - 1}
              >
                <span className="sr-only">Última</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Você tem certeza?</DialogTitle>
            <DialogDescription>
              Essa ação não pode ser desfeita. Isso irá permanentemente excluir
              a recorrência selecionada.
            </DialogDescription>
          </DialogHeader>
          <div className="flex space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1"
              isLoading={isRemovingRecurring}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              variant="destructive"
              onClick={onDeleteRecurringTransaction}
              isLoading={isRemovingRecurring}
            >
              Deletar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <RecurringTransactionModal
        isOpen={isEditRecurringModalOpen}
        onClose={closeEditModal}
        action="update"
        recurringTransaction={recurringTransactionToEdit}
      />
    </div>
  );
}
