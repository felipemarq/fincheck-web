// components/transactions/TransactionsTable.tsx
import * as React from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  /*   type DragEndEvent, */
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheckFilled,
  IconDotsVertical,
  // IconGripVertical,
  IconLayoutColumns,
  IconLoader,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type VisibilityState,
  type SortingState,
} from "@tanstack/react-table";
import { toast } from "sonner";

import { Badge } from "@/view/components/ui/badge";
//import { Checkbox } from "@/view/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
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
import { Separator } from "@/view/components/ui/separator";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/view/components/ui/drawer";
import type { Transaction } from "@/app/entities/Transaction";
import type {
  ListTransactionsParams,
  TransactionWithRefsDTO,
} from "@/app/services/transactionService/getAll";
import {
  TransactionModal,
  type TransactionType,
} from "../modals/TransactionModal";
import { useTransactions } from "@/app/hooks/useTransactions";
import { TRANSACTION_TYPE_LABELS_PT } from "../i18n/pt/transaction";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transactionService } from "@/app/services/transactionService";
import { treatAxiosError } from "@/app/utils/treatAxiosError";
import type { AxiosError } from "axios";
import { QueryKeys } from "@/app/config/QueryKeys";
import { Button } from "@/components/ui/button";

// ---------------- utils ----------------
function formatMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function shortId(id: string) {
  return id.slice(0, 6) + "…" + id.slice(-4);
}
function formatDateIso(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

/* // -------------- Drag handle --------------
function DragHandle({ id }: { id: UniqueIdentifier }) {
  const { attributes, listeners } = useSortable({ id });
  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="text-muted-foreground size-7 hover:bg-transparent"
    >
      <IconGripVertical className="text-muted-foreground size-3" />
      <span className="sr-only">Arrastar</span>
    </Button>
  );
} */

// -------------- Colunas --------------
type RowType = TransactionWithRefsDTO;

// -------------- Filtros UI model --------------
type LocalFilters = {
  search?: string;
  types: Transaction.Type[]; // multi
  isPaid?: "all" | "true" | "false";
  startDate?: string;
  endDate?: string;
  dueDateStart?: string;
  dueDateEnd?: string;
  minValue?: string;
  maxValue?: string;
  sortBy?: "date" | "dueDate" | "createdAt" | "value" | "name";
  sortDir?: "asc" | "desc";
  accountId?: string[]; // multi
  categoryId?: string[]; // multi
  pageSize: number; // client state
};

const DEFAULT_LOCAL: LocalFilters = {
  search: "",
  types: [],
  isPaid: "all",
  pageSize: 10,
  sortBy: "date",
  sortDir: "desc",
};

// -------------- Componente principal --------------
export function TransactionsTable({
  entityId,
  initialAccountIds = [],
  initialCategoryIds = [],
  initialTypes = [],
  initialIsPaid = "all",
  initialSortBy = "date",
  initialSortDir = "desc",
  enabled = true,
}: {
  entityId: string;
  initialAccountIds?: string[];
  initialCategoryIds?: string[];
  initialTypes?: Transaction.Type[];
  initialIsPaid?: "all" | "true" | "false";
  initialSortBy?: "date" | "dueDate" | "createdAt" | "value" | "name";
  initialSortDir?: "asc" | "desc";
  enabled?: boolean;
}) {
  // estado dos filtros/paginação/ordenação
  const [local, setLocal] = React.useState<LocalFilters>({
    ...DEFAULT_LOCAL,
    accountId: initialAccountIds,
    categoryId: initialCategoryIds,
    types: initialTypes,
    isPaid: initialIsPaid,
    sortBy: initialSortBy,
    sortDir: initialSortDir,
  });
  const [pageIndex, setPageIndex] = React.useState(0); // 0-based no UI
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: initialSortBy, desc: initialSortDir === "desc" },
  ]);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );

  const queryClient = useQueryClient();
  const [transactionIdBeeingDeleted, settransactionIBeeingDeleted] =
    React.useState<string | null>(null);
  const [transactionBeeingEdited, setTransactionBeeingEdited] =
    React.useState<TransactionWithRefsDTO | null>(null);
  const [isEditTransactionModalOpen, setIsEditTransactionModalOpen] =
    React.useState(false);
  const [isDeleteTransactionModalOpen, setIsDeleteTransactionModalOpen] =
    React.useState(false);

  const openDeleteTransactionModal = (transactionId: string) => {
    settransactionIBeeingDeleted(transactionId);
    setIsDeleteTransactionModalOpen(true);
  };

  const closeDeleteTransactionModal = () => {
    settransactionIBeeingDeleted(null);
    setIsDeleteTransactionModalOpen(false);
  };

  const openEditTransactionModal = (transaction: TransactionWithRefsDTO) => {
    setTransactionBeeingEdited(transaction);
    setIsEditTransactionModalOpen(true);
  };

  const closeEditTransactionModal = () => {
    setTransactionBeeingEdited(null);
    setIsEditTransactionModalOpen(false);
  };

  const {
    isPending: isLoadingRemoveTransaction,
    mutateAsync: mutateAsyncRemoveTransaction,
  } = useMutation({
    mutationFn: transactionService.remove,
  });

  const onDeleteTransaction = async (transactionId: string) => {
    try {
      await mutateAsyncRemoveTransaction({
        transactionId,
        entityId,
      });
      closeDeleteTransactionModal();
      toast.success("Transação excluída com sucesso!");
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.RECURRING_TRANSACTIONS],
      });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.TRANSACTIONS] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.DASHBOARD] });
    } catch (error) {
      treatAxiosError(error as AxiosError);
    }
  };

  // build filtros p/ API
  const apiFilters: ListTransactionsParams = React.useMemo(
    () => ({
      entityId,
      accountId: local.accountId,
      categoryId: local.categoryId,
      type: local.types,
      isPaid: local.isPaid === "all" ? undefined : local.isPaid === "true",
      startDate: local.startDate,
      endDate: local.endDate,
      dueDateStart: local.dueDateStart,
      dueDateEnd: local.dueDateEnd,
      minValue: local.minValue ? Number(local.minValue) : undefined,
      maxValue: local.maxValue ? Number(local.maxValue) : undefined,
      sortBy: local.sortBy,
      sortDir: local.sortDir,
      page: pageIndex + 1, // backend é 1-based
      pageSize: local.pageSize,
      search: local.search?.trim() || undefined,
    }),
    [entityId, local, pageIndex]
  );

  const { transactions, isFetchingTransactions } = useTransactions(
    apiFilters,
    enabled
  );

  // dados p/ tabela
  const items = transactions?.items ?? [];
  const total = transactions?.total ?? 0;
  const pageSize = transactions?.pageSize ?? local.pageSize;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // dnd (permanece só visual)
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );
  const dataIds = React.useMemo<UniqueIdentifier[]>(
    //@ts-ignore
    () => items.map((t) => t.id),
    [items]
  );

  /*  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (active && over && active.id !== over.id) {
      // só rearranjo visual — NÃO persiste (server is source of truth)
      // manter consistência no client enquanto não refaz a query:
      const oldIndex = dataIds.indexOf(active.id);
      const newIndex = dataIds.indexOf(over.id);
      // não altero `items` pois vêm do servidor; opcional: usar estado local
      // aqui deixo sem efeito para não conflitar com paginação server-side
    }
  } */

  const columns: ColumnDef<RowType>[] = [
    /*  {
    id: "drag",
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.original.id} />,
    enableSorting: false,
    enableHiding: false,
  }, */
    /*  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  }, */
    {
      accessorKey: "date",
      header: "Data",
      enableSorting: true, // mapeado p/ sortBy=date
      cell: ({ row }) => formatDateIso(row.original.date),
    },
    {
      accessorKey: "name",
      header: "Nome",
      enableSorting: true, // sortBy=name
      cell: ({ row }) => (
        <TableCellViewer item={row.original as TransactionWithRefsDTO} />
      ),
    },
    {
      accessorKey: "type",
      header: "Tipo",
      cell: ({ row }) => {
        const t = row.original.type;
        const color =
          t === "INCOME"
            ? "border-green-500 text-green-600"
            : "border-red-500 text-red-600";
        return (
          <Badge variant="outline" className={`px-1.5 ${color}`}>
            {TRANSACTION_TYPE_LABELS_PT[t]}
          </Badge>
        );
      },
    },
    {
      accessorKey: "value",
      header: () => <div className="w-full text-right">Valor</div>,
      enableSorting: true, // sortBy=value
      cell: ({ row }) => {
        const v = row.original.value;
        const t = row.original.type;
        const signed = t === "EXPENSE" ? -Math.abs(v) : Math.abs(v);
        const cls = t === "EXPENSE" ? "text-red-600" : "text-green-600";
        return (
          <div className={`text-right font-medium ${cls}`}>
            {formatMoney(signed)}
          </div>
        );
      },
    },
    {
      accessorKey: "isPaid",
      header: "Pago",
      cell: ({ row }) => (
        <Badge variant="outline" className="px-1.5">
          {row.original.isPaid ? (
            <>
              <IconCircleCheckFilled className="mr-1 fill-green-500 dark:fill-green-400" />{" "}
              Pago
            </>
          ) : (
            <>
              <IconLoader className="mr-1" /> Em aberto
            </>
          )}
        </Badge>
      ),
    },
    {
      accessorKey: "dueDate",
      header: "Venc.",
      cell: ({ row }) => formatDateIso(row.original.dueDate),
    },
    {
      accessorKey: "account.name",
      header: "Conta",
      cell: ({ row }) => row.original.account?.name,
    },
    {
      accessorKey: "category.name",
      header: "Categoria",
      cell: ({ row }) => row.original.category?.name,
    },
    {
      id: "actions",
      cell: ({ row }) => (
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
              onClick={() => openEditTransactionModal(row.original)}
            >
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => console.log(row)}>
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => openDeleteTransactionModal(row.original.id)}
            >
              <IconTrash className="mr-2" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
  const table = useReactTable({
    data: items,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination: { pageIndex, pageSize },
    },

    // server-side
    manualPagination: true,
    pageCount,
    manualSorting: true,

    // handlers UI
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,

    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({ pageIndex, pageSize })
          : updater;
      setPageIndex(next.pageIndex);
      // pageSize controlado por local
    },

    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      setSorting(next);
      // extrai a 1ª coluna para enviar ao backend
      const first = next[0];
      if (first) {
        setLocal((s) => ({
          ...s,
          sortBy: (first.id as LocalFilters["sortBy"]) ?? "date",
          sortDir: first.desc ? "desc" : "asc",
        }));
      } else {
        setLocal((s) => ({ ...s, sortBy: "date", sortDir: "desc" }));
      }
      // mantém page 1
      setPageIndex(0);
    },

    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // --------- UI filtros (top bar) ----------
  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setPageIndex(0);
  }

  return (
    <div className="w-full flex-col gap-4">
      {/* Filtros */}
      <div className="flex flex-col gap-3 px-4 lg:px-6 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={applySearch} className="flex items-center gap-2">
            <div className="relative">
              <IconSearch className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
              <Input
                className="pl-8 w-56"
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
            value={local.isPaid ?? "all"}
            onValueChange={(v) => {
              setLocal((s) => ({ ...s, isPaid: v as LocalFilters["isPaid"] }));
              setPageIndex(0);
            }}
          >
            <SelectTrigger className="w-36" size="sm">
              <SelectValue placeholder="Pago?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">Somente pagos</SelectItem>
              <SelectItem value="false">Somente em aberto</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={local.sortBy}
            onValueChange={(v) => {
              setLocal((s) => ({ ...s, sortBy: v as LocalFilters["sortBy"] }));
              setSorting([{ id: v, desc: local.sortDir === "desc" }]);
              setPageIndex(0);
            }}
          >
            <SelectTrigger className="w-40" size="sm">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Data</SelectItem>
              <SelectItem value="dueDate">Vencimento</SelectItem>
              <SelectItem value="createdAt">Criado em</SelectItem>
              <SelectItem value="value">Valor</SelectItem>
              <SelectItem value="name">Nome</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={local.sortDir}
            onValueChange={(v) => {
              setLocal((s) => ({ ...s, sortDir: v as "asc" | "desc" }));
              setSorting([{ id: local.sortBy!, desc: v === "desc" }]);
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

          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <IconLayoutColumns />
                  <span className="hidden lg:inline">Colunas</span>
                  <IconChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {table
                  .getAllColumns()
                  .filter(
                    (column) =>
                      typeof column.accessorFn !== "undefined" &&
                      column.getCanHide()
                  )
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Linha 2 — datas/valor/tipo (multi) */}
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
            type="date"
            value={local.dueDateStart?.slice(0, 10) || ""}
            onChange={(e) => {
              setLocal((s) => ({
                ...s,
                dueDateStart: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : undefined,
              }));
              setPageIndex(0);
            }}
            className="w-40"
            placeholder="Venc. início"
          />
          <Input
            type="date"
            value={local.dueDateEnd?.slice(0, 10) || ""}
            onChange={(e) => {
              setLocal((s) => ({
                ...s,
                dueDateEnd: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : undefined,
              }));
              setPageIndex(0);
            }}
            className="w-40"
            placeholder="Venc. fim"
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
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={local.maxValue ?? ""}
            onChange={(e) => {
              setLocal((s) => ({ ...s, maxValue: e.target.value }));
              setPageIndex(0);
            }}
            className="w-32"
            placeholder="Max R$"
          />

          <Select
            value={local.types[0] ?? "-"}
            onValueChange={(v) => {
              // simples: alterna único; se quiser multi, troque por combobox
              //@ts-ignore
              setLocal((s) => ({
                ...s,
                types: v === "-" ? [] : [v as TransactionType],
              }));
              setPageIndex(0);
            }}
          >
            <SelectTrigger className="w-44" size="sm">
              <SelectValue placeholder="Tipo (ambos)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-">Ambos</SelectItem>
              <SelectItem value="INCOME">Receitas</SelectItem>
              <SelectItem value="EXPENSE">Despesas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela */}
      <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            //onDragEnd={handleDragEnd}
            sensors={sensors}
            id={React.useId()}
          >
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((h) => (
                      <TableHead
                        key={h.id}
                        className={
                          h.column.getCanSort()
                            ? "cursor-pointer select-none"
                            : ""
                        }
                        onClick={() => {
                          if (!h.column.getCanSort()) return;
                          // alterna local sorting (server)
                          const current = sorting[0];
                          let desc = true;
                          if (current?.id === h.column.id) desc = !current.desc;
                          table.setSorting([{ id: h.column.id, desc }]);
                        }}
                      >
                        {h.isPlaceholder
                          ? null
                          : flexRender(
                              h.column.columnDef.header,
                              h.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {items.length ? (
                  <SortableContext
                    items={dataIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {table.getRowModel().rows.map((row) => (
                      <DraggableRow key={row.id} row={row} />
                    ))}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      {isFetchingTransactions
                        ? "Carregando..."
                        : "Sem resultados."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>

        {/* Footer de paginação */}
        <div className="flex items-center justify-between px-2 lg:px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            {table.getFilteredSelectedRowModel().rows.length} de{" "}
            {table.getRowModel().rows.length} selecionadas.
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
      <Dialog
        open={isDeleteTransactionModalOpen}
        onOpenChange={setIsDeleteTransactionModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Você tem certeza?</DialogTitle>
            <DialogDescription>
              Essa ação não pode ser desfeita. Isso irá permanentemente excluir
              a transação.
            </DialogDescription>
          </DialogHeader>
          <div className="flex space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => closeDeleteTransactionModal()}
              className="flex-1"
              isLoading={isLoadingRemoveTransaction}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              variant="destructive"
              onClick={() => onDeleteTransaction(transactionIdBeeingDeleted!)}
              isLoading={isLoadingRemoveTransaction}
            >
              Deletar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <TransactionModal
        isOpen={isEditTransactionModalOpen}
        onClose={closeEditTransactionModal}
        action="update"
        //@ts-ignore
        transaction={transactionBeeingEdited}
      />
    </div>
  );
}

// ---------- Row arrastável ----------
function DraggableRow({ row }: { row: any }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  });

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {row.getVisibleCells().map((cell: any) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}

// ---------- Drawer de detalhes ----------
function TableCellViewer({ item }: { item: TransactionWithRefsDTO }) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="link" className="text-foreground w-fit px-0 text-left">
          {item.name}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{item.name}</DrawerTitle>
          <div className="text-sm text-muted-foreground">
            {item.type} • {formatMoney(item.value)} • {formatDateIso(item.date)}
          </div>
        </DrawerHeader>
        <div className="flex flex-col gap-3 px-4 py-2 text-sm">
          <div>
            <strong>Conta:</strong> {shortId(item.accountId)}
          </div>
          <div>
            <strong>Categoria:</strong> {shortId(item.categoryId)}
          </div>
          <div>
            <strong>Pago:</strong> {item.isPaid ? "Sim" : "Não"}
          </div>
          <div>
            <strong>Vencimento:</strong> {formatDateIso(item.dueDate)}
          </div>
          {item.notes ? (
            <div>
              <strong>Obs.:</strong> {item.notes}
            </div>
          ) : null}
          <Separator />
          <div className="text-muted-foreground">
            Criado:{" "}
            {item.createdAt
              ? new Date(item.createdAt).toLocaleString("pt-BR")
              : "—"}{" "}
            | Atualizado:{" "}
            {item.updatedAt
              ? new Date(item.updatedAt).toLocaleString("pt-BR")
              : "—"}
          </div>
        </div>
        <DrawerFooter>
          <Button onClick={() => toast.message("Salvar alterações (WIP)")}>
            Salvar
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Fechar</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
