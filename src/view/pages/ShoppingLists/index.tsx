import { useDeferredValue, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCheck, ClipboardList, ExternalLink, Link2, Plus, Search, ShoppingBag, Pencil, Trash2, Archive, RotateCcw, CalendarClock, ArrowUpRight, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { QueryKeys } from "@/app/config/QueryKeys";
import type { ShoppingListItem } from "@/app/entities/ShoppingList";
import { useAuth } from "@/app/hooks/useAuth";
import { usePurchaseOrderItems } from "@/app/hooks/usePurchaseOrderItems";
import { shoppingListService as api } from "@/app/services/shoppingListService";
import { treatAxiosError } from "@/app/utils/treatAxiosError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/view/components/ui/checkbox";
import { SupplierPurchaseModal } from "@/view/modals/SupplierPurchaseModal";
import { formatCurrency } from "@/view/pages/PurchaseOrders/purchaseOrderPresentation";
import { ListDialog } from "./ListDialog";
import { ShoppingItemDialog } from "./ShoppingItemDialog";
import { QuickLinksDialog } from "./QuickLinksDialog";

export default function ShoppingLists() {
  const { selectedEntityId } = useAuth();
  if (!selectedEntityId) return <p className="p-6 text-muted-foreground">Selecione uma organização para acessar as listas de compras.</p>;
  return <ShoppingListsWorkspace key={selectedEntityId} entityId={selectedEntityId} />;
}

function ShoppingListsWorkspace({ entityId }: { entityId: string }) {
  const { can } = useAuth();
  const canEdit = can("quotations.create") || can("purchases.create");
  const canPurchase = can("purchases.create");
  const navigate = useNavigate();
  const { shoppingListId } = useParams();
  const client = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState("PENDING");
  const [priority, setPriority] = useState("ALL");
  const [listDialog, setListDialog] = useState<"new" | "edit" | null>(null);
  const [itemDialog, setItemDialog] = useState<ShoppingListItem | "new" | null>(null);
  const [quickLinks, setQuickLinks] = useState(false);
  const [purchaseItem, setPurchaseItem] = useState<ShoppingListItem | null>(null);
  const [removeItem, setRemoveItem] = useState<ShoppingListItem | null>(null);
  const queryKey = [QueryKeys.SHOPPING_LISTS, entityId];
  const listsQuery = useQuery({ queryKey, queryFn: () => api.list(entityId), refetchInterval: 15_000 });
  const lists = listsQuery.data ?? [];
  const visibleLists = lists.filter(list => list.archived === showArchived);
  const activeId = shoppingListId ?? visibleLists[0]?.id;
  const detailQuery = useQuery({ queryKey: [...queryKey, activeId], queryFn: () => api.detail(entityId, activeId!), enabled: Boolean(activeId), refetchInterval: 8_000 });
  const active = detailQuery.data?.list;
  const items = detailQuery.data?.items ?? [];
  const writable = Boolean(active && !active.archived);
  const refresh = () => client.invalidateQueries({ queryKey });
  const mutation = useMutation({ mutationFn: (work: () => Promise<void>) => work(), onSuccess: refresh,
    onError: error => { treatAxiosError(error); void refresh(); } });
  const run = (work: () => Promise<void>) => mutation.mutateAsync(work);
  const pendingItems = items.filter(item => !item.purchasedAt);
  const purchasedCount = items.length - pendingItems.length;
  const progress = items.length ? Math.round(purchasedCount / items.length * 100) : 0;
  const estimated = pendingItems.reduce((sum, item) => sum + (item.quantity ?? 0) * (item.estimatedUnitPrice ?? 0), 0);
  const pricedCount = pendingItems.filter(item => item.quantity != null && item.estimatedUnitPrice != null).length;
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const filtered = items.filter(item =>
    (status === "ALL" || (status === "PURCHASED" ? Boolean(item.purchasedAt) : !item.purchasedAt)) &&
    (priority === "ALL" || item.priority === priority) &&
    [item.title, item.url, item.productName, item.orderNumber, item.notes, item.sellerName, item.createdByName].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR").includes(deferredSearch.trim().toLocaleLowerCase("pt-BR"))
  ).sort((a, b) => Number(Boolean(a.purchasedAt)) - Number(Boolean(b.purchasedAt)) ||
    ({ URGENT: 0, HIGH: 1, NORMAL: 2 }[a.priority ?? "NORMAL"] - { URGENT: 0, HIGH: 1, NORMAL: 2 }[b.priority ?? "NORMAL"]) ||
    (a.neededBy ?? "9999").localeCompare(b.neededBy ?? "9999"));

  const { items: destinationPage = [] } = usePurchaseOrderItems({ entityId, page: 1, pageSize: 100, sort: "URGENCY" }, Boolean(purchaseItem));
  const { items: exactDestination = [] } = usePurchaseOrderItems({ entityId, page: 1, pageSize: 10, purchaseOrderItemId: purchaseItem?.purchaseOrderItemId ?? undefined }, Boolean(purchaseItem?.purchaseOrderItemId));
  const destinations = [...new Map([...destinationPage, ...exactDestination].map(item => [item.id, item])).values()];

  return <div className="flex flex-col gap-6 px-4 py-5 lg:px-6 lg:py-7">
    <section className="relative overflow-hidden rounded-2xl border bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.16),transparent_55%)] p-5 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl"><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300"><ListChecks className="size-4" /> Da pesquisa à compra</div>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Listas de compras</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Todos os links da equipe em um só lugar. Abra, compre e marque. Os detalhes ficam por sua conta.</p></div>
        {canEdit && <Button size="lg" onClick={() => setListDialog("new")}><Plus /> Nova lista</Button>}
      </div>
    </section>
    {listsQuery.isError ? <ErrorState text="Não foi possível carregar as listas." onRetry={() => void listsQuery.refetch()} />
      : listsQuery.isPending ? <p className="p-10 text-center text-muted-foreground">Carregando listas...</p>
      : <div className="grid items-start gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-3 xl:sticky xl:top-5">
          <div className="flex items-center justify-between px-1"><h3 className="text-sm font-medium">Suas listas</h3><button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setShowArchived(!showArchived)}>{showArchived ? "Ver ativas" : "Ver arquivadas"}</button></div>
          <div className="flex gap-2 overflow-x-auto pb-2 xl:flex-col xl:overflow-visible">
            {visibleLists.map(list => <button key={list.id} type="button" onClick={() => { navigate(`/shopping-lists/${list.id}`); setSearch(""); }} className={`min-w-52 rounded-xl border p-4 text-left transition-colors xl:w-full ${list.id === activeId ? "border-emerald-500/40 bg-emerald-500/10" : "bg-card/50 hover:bg-muted/30"}`}>
              <div className="flex items-start justify-between gap-2"><span className="break-words text-sm font-semibold">{list.name}</span>{list.archived ? <Archive className="size-4 shrink-0 text-muted-foreground" /> : <ClipboardList className="size-4 shrink-0 text-emerald-400" />}</div>
              <p className="mt-2 text-xs text-muted-foreground">{list.totalItems - list.purchasedItems} pendentes · {list.purchasedItems} comprados</p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${list.totalItems ? list.purchasedItems / list.totalItems * 100 : 0}%` }} /></div>
            </button>)}
            {!visibleLists.length && <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{showArchived ? "Nenhuma lista arquivada." : "Crie uma lista para começar."}</p>}
          </div>
          <div className="hidden rounded-xl border bg-muted/10 p-4 text-xs leading-5 text-muted-foreground xl:block"><Link2 className="mb-2 size-5 text-emerald-400" />Basta um link para começar. A equipe pode completar os detalhes depois.</div>
        </aside>
        <main className="min-w-0 space-y-5">
          {detailQuery.isError ? <ErrorState text="Esta lista não está disponível." onRetry={() => void detailQuery.refetch()} />
            : activeId && detailQuery.isPending ? <p className="p-10 text-center text-muted-foreground">Carregando itens...</p>
            : !active ? <div className="rounded-2xl border border-dashed p-10 text-center"><ShoppingBag className="mx-auto size-10 text-emerald-400" /><h3 className="mt-4 text-lg font-semibold">Uma compra organizada começa aqui</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Crie sua primeira lista e compartilhe links com a equipe. Cada compra ganha um check e pode virar um pedido ao fornecedor.</p></div>
            : <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><h3 className="break-words text-2xl font-semibold">{active.name}</h3>{active.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{active.notes}</p>}<p className="mt-2 text-xs text-muted-foreground">{active.archived ? "Lista arquivada · reabra para editar" : "Compartilhada com a equipe · atualização automática"}</p></div>
                {canEdit && <div className="flex shrink-0 gap-2"><Button variant="outline" size="sm" onClick={() => setListDialog("edit")}><Pencil className="size-4" /> Editar</Button><Button variant="outline" size="sm" disabled={mutation.isPending} onClick={() => { void run(async () => { await api.updateList(entityId, active.id, { archived: !active.archived }); toast.success(active.archived ? "Lista reaberta." : "Lista arquivada."); }).catch(() => {}); }}>{active.archived ? <RotateCcw className="size-4" /> : <Archive className="size-4" />}{active.archived ? "Reabrir" : "Arquivar"}</Button></div>}
              </div>
              <div className="grid gap-3 sm:grid-cols-3"><Metric label="Ainda falta comprar" value={String(pendingItems.length)} detail={`${items.length} ${items.length === 1 ? "item na lista" : "itens na lista"}`} /><Metric label="Comprados" value={String(purchasedCount)} detail={`${progress}% concluído`} accent /><Metric label="Estimativa pendente" value={pricedCount ? formatCurrency(estimated) : "A definir"} detail={pricedCount ? `${pricedCount} de ${pendingItems.length} itens com preço e quantidade` : "Informe preços e quantidades quando souber"} /></div>
              <div role="progressbar" aria-label="Progresso da lista" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} /></div>
              <div className="flex flex-wrap items-center gap-2"><div className="mr-auto flex gap-1 rounded-lg border bg-muted/10 p-1">{[["PENDING", "Pendentes"], ["PURCHASED", "Comprados"], ["ALL", "Todos"]].map(([value, label]) => <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)} className={`rounded-md px-3 py-1.5 text-sm ${status === value ? "bg-background font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>)}</div>
                {canEdit && writable && <><Button variant="outline" size="sm" onClick={() => setQuickLinks(true)}><Link2 /> Colar links</Button><Button size="sm" onClick={() => setItemDialog("new")}><Plus /> Adicionar item</Button></>}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Pesquisar itens da lista" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Produto, link, OC, loja ou observação" /></div><Select value={priority} onValueChange={setPriority}><SelectTrigger className="w-full sm:w-48" aria-label="Filtrar prioridade"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Todas as prioridades</SelectItem><SelectItem value="URGENT">Urgente</SelectItem><SelectItem value="HIGH">Alta</SelectItem><SelectItem value="NORMAL">Normal</SelectItem></SelectContent></Select></div>
              <div className="space-y-3">
                {filtered.map(item => <article key={item.id} className={`group rounded-2xl border p-4 transition-colors sm:p-5 ${item.purchasedAt ? "border-emerald-500/15 bg-emerald-500/[0.03]" : "bg-card/50 hover:border-emerald-500/25"}`}>
                  <div className="flex gap-4"><div className="pt-1"><Checkbox className="size-5" checked={Boolean(item.purchasedAt)} disabled={!canPurchase || !writable || Boolean(item.acquisitionId) || mutation.isPending} aria-label={`${item.purchasedAt ? "Desmarcar compra" : "Marcar como comprado"}: ${item.title || item.productName || new URL(item.url).hostname}`} onCheckedChange={checked => { void run(async () => { await api.check(entityId, item, checked === true); toast.success(checked ? "Item marcado como comprado." : "Item voltou para os pendentes."); }).catch(() => {}); }} /></div>
                    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className={`break-words font-semibold ${item.purchasedAt ? "text-muted-foreground" : ""}`}>{item.title || item.productName || new URL(item.url).hostname}</h4>
                      {item.priority !== "NORMAL" && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.priority === "URGENT" ? "bg-rose-500/10 text-rose-300" : "bg-amber-500/10 text-amber-300"}`}>{item.priority === "URGENT" ? "Urgente" : "Prioridade alta"}</span>}
                      {item.purchasedAt && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300"><Check className="size-3" /> Comprado</span>}
                    </div>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex max-w-full items-center gap-1.5 text-sm text-emerald-300 hover:underline"><Link2 className="size-3.5 shrink-0" /><span className="truncate">{new URL(item.url).hostname}{new URL(item.url).pathname === "/" ? "" : new URL(item.url).pathname}</span><ExternalLink className="size-3 shrink-0" /></a>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                      {item.orderNumber && <Link className="rounded-md bg-muted/40 px-2 py-1 hover:text-foreground" to={`/orders/${item.purchaseOrderId}`}>OC {item.orderNumber} <ArrowUpRight className="inline size-3" /></Link>}
                      {item.productName && <span className="py-1">{item.productName}</span>}{item.quantity != null && <span className="py-1">Quantidade: <strong className="text-foreground">{item.quantity.toLocaleString("pt-BR")}</strong></span>}
                      {item.estimatedUnitPrice != null && <span className="py-1">{formatCurrency(item.estimatedUnitPrice)} / un.{item.quantity != null && ` · ${formatCurrency(item.quantity * item.estimatedUnitPrice)}`}</span>}
                      {item.sellerName && <span className="py-1">{item.sellerName}</span>}{item.neededBy && <span className={`inline-flex items-center gap-1 py-1 ${!item.purchasedAt && item.neededBy < today ? "text-rose-300" : ""}`}><CalendarClock className="size-3.5" /> Até {item.neededBy.split("-").reverse().join("/")}</span>}
                    </div>
                    {item.notes && <p className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-muted/20 px-3 py-2 text-sm leading-6 text-muted-foreground">{item.notes}</p>}
                    <div className="mt-4 flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">{item.purchasedAt ? `Comprado por ${item.purchasedByName || "membro da equipe"} em ${new Date(item.purchasedAt).toLocaleDateString("pt-BR")}` : `Adicionado por ${item.createdByName || "membro da equipe"}`}</p>
                      <div className="flex flex-wrap gap-2"><Button asChild variant="outline" size="sm"><a href={item.url} target="_blank" rel="noopener noreferrer">Abrir loja <ExternalLink /></a></Button>
                        {item.acquisitionId ? <Button asChild variant="outline" size="sm"><Link to={`/purchases?edit=${item.acquisitionId}`}><CheckCheck /> Ver pedido</Link></Button> : <>
                          {canPurchase && writable && <Button size="sm" onClick={() => setPurchaseItem(item)}><ShoppingBag />{item.purchasedAt ? "Registrar compra" : "Comprar e registrar"}</Button>}
                          {canEdit && writable && <><Button size="sm" variant="ghost" aria-label="Editar item" onClick={() => setItemDialog(item)}><Pencil /></Button><Button size="sm" variant="ghost" aria-label="Excluir item" onClick={() => setRemoveItem(item)}><Trash2 className="text-muted-foreground" /></Button></>}
                        </>}
                      </div>
                    </div>
                  </div></div>
                </article>)}
                {!filtered.length && <div className="rounded-2xl border border-dashed px-5 py-12 text-center"><ListChecks className="mx-auto size-9 text-muted-foreground" /><p className="mt-4 font-medium">{!items.length ? "A lista está pronta para receber links" : !pendingItems.length && status === "PENDING" && !search && priority === "ALL" ? "Tudo comprado por aqui!" : "Nenhum item com esses filtros"}</p><p className="mt-2 text-sm text-muted-foreground">{!items.length ? "Adicione um item com detalhes ou cole vários links de uma vez." : "Use os filtros para conferir os demais itens da lista."}</p></div>}
              </div>
              {canPurchase && writable && <p className="text-xs leading-5 text-muted-foreground">O check confirma a compra na lista. “Comprar e registrar” também cria o pedido ao fornecedor, com produto, pagamento e destinação à OC.</p>}
            </>}
        </main>
      </div>}
    {listDialog && <ListDialog list={listDialog === "edit" ? active : undefined} pending={mutation.isPending} onClose={() => setListDialog(null)} onSave={input => run(async () => {
      if (listDialog === "edit" && active) await api.updateList(entityId, active.id, input);
      else { const created = await api.create(entityId, input); setShowArchived(false); navigate(`/shopping-lists/${created.id}`); }
      toast.success(listDialog === "edit" ? "Lista atualizada." : "Lista criada.");
    })} />}
    {itemDialog && active && <ShoppingItemDialog item={itemDialog === "new" ? undefined : itemDialog} pending={mutation.isPending} onClose={() => setItemDialog(null)} onSave={input => run(async () => {
      if (itemDialog === "new") await api.add(entityId, active.id, [input]); else await api.updateItem(entityId, itemDialog, input);
      toast.success(itemDialog === "new" ? "Item adicionado." : "Item atualizado.");
    })} />}
    {quickLinks && active && <QuickLinksDialog pending={mutation.isPending} onClose={() => setQuickLinks(false)} onSave={urls => run(async () => { await api.add(entityId, active.id, urls.map(url => ({ url }))); toast.success(`${urls.length} ${urls.length === 1 ? "link adicionado" : "links adicionados"}.`); })} />}
    {purchaseItem && <SupplierPurchaseModal isOpen onClose={() => setPurchaseItem(null)} destinations={destinations} initialShoppingItem={purchaseItem} onCreate={async input => {
      try { const purchase = await api.purchase(entityId, purchaseItem, input); await refresh(); return purchase; }
      catch (error) { void refresh(); throw error; }
    }} />}
    {removeItem && <Dialog open onOpenChange={open => !open && !mutation.isPending && setRemoveItem(null)}><DialogContent><DialogHeader><DialogTitle>Excluir este item?</DialogTitle><DialogDescription>{removeItem.title || removeItem.productName || removeItem.url}</DialogDescription></DialogHeader><div className="flex justify-end gap-2"><Button variant="outline" disabled={mutation.isPending} onClick={() => setRemoveItem(null)}>Cancelar</Button><Button variant="destructive" isLoading={mutation.isPending} onClick={() => { void run(async () => { await api.remove(entityId, removeItem); setRemoveItem(null); toast.success("Item excluído."); }).catch(() => {}); }}>Excluir item</Button></div></DialogContent></Dialog>}
  </div>;
}

function Metric({ label, value, detail, accent }: { label: string; value: string; detail: string; accent?: boolean }) {
  return <div className="rounded-xl border bg-card/50 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-2 text-2xl font-semibold tracking-tight ${accent ? "text-emerald-300" : ""}`}>{value}</p><p className="mt-2 text-xs text-muted-foreground">{detail}</p></div>;
}
function ErrorState({ text, onRetry }: { text: string; onRetry: () => void }) {
  return <div role="alert" className="rounded-xl border border-destructive/30 p-5"><p className="text-sm">{text}</p><Button className="mt-3" variant="outline" size="sm" onClick={onRetry}>Tentar novamente</Button></div>;
}
