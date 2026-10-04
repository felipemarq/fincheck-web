import { useState } from "react";
import type { ShoppingListItem, ShoppingListItemInput } from "@/app/entities/ShoppingList";
import { useAuth } from "@/app/hooks/useAuth";
import { useProducts } from "@/app/hooks/useProducts";
import { usePurchaseOrders } from "@/app/hooks/usePurchaseOrders";
import { usePurchaseOrder } from "@/app/hooks/usePurchaseOrder";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductCombobox } from "@/view/components/ProductCombobox";

export function ShoppingItemDialog({ item, onClose, onSave, pending }: {
  item?: ShoppingListItem; onClose: () => void;
  onSave: (input: ShoppingListItemInput) => Promise<void>; pending: boolean;
}) {
  const { selectedEntityId } = useAuth();
  const [draft, setDraft] = useState({
    url: item?.url ?? "", title: item?.title ?? "", productId: item?.productId ?? "",
    purchaseOrderId: item?.purchaseOrderId ?? "", purchaseOrderItemId: item?.purchaseOrderItemId ?? "",
    quantity: item?.quantity?.toString() ?? "", estimatedUnitPrice: item?.estimatedUnitPrice?.toString() ?? "",
    sellerName: item?.sellerName ?? "", priority: item?.priority ?? "NORMAL", neededBy: item?.neededBy ?? "", notes: item?.notes ?? "",
  });
  const [details, setDetails] = useState(Boolean(item));
  const [error, setError] = useState("");
  const entityId = selectedEntityId ?? "";
  const { products = [], isError: productsError } = useProducts({ entityId, active: true }, details);
  const { orders = [], isError: ordersError } = usePurchaseOrders({ entityId, lifecycleStatus: "ACTIVE" }, details);
  const { order, isFetchingOrder } = usePurchaseOrder({ entityId, purchaseOrderId: draft.purchaseOrderId }, details && Boolean(draft.purchaseOrderId));
  const set = (key: keyof typeof draft, value: string) => setDraft(current => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const url = draft.url.trim();
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error();
    } catch { setError("Informe um link de compra completo, começando com https:// ou http://."); return; }
    const quantity = draft.quantity ? Number(draft.quantity) : null;
    const price = draft.estimatedUnitPrice ? Number(draft.estimatedUnitPrice) : null;
    if (quantity !== null && (!Number.isFinite(quantity) || quantity <= 0 || quantity > 99_999_999_999)) { setError("A quantidade precisa ser maior que zero."); return; }
    if (price !== null && (!Number.isFinite(price) || price < 0 || price > 9_999_999_999)) { setError("Informe um preço válido, maior ou igual a zero."); return; }
    try {
      await onSave({ ...draft, url, title: draft.title.trim() || null, productId: draft.productId || null,
        purchaseOrderId: draft.purchaseOrderId || null, purchaseOrderItemId: draft.purchaseOrderItemId || null,
        quantity, estimatedUnitPrice: price, sellerName: draft.sellerName.trim() || null,
        priority: draft.priority as ShoppingListItemInput["priority"], neededBy: draft.neededBy || null, notes: draft.notes.trim() || null });
      onClose();
    } catch { /* Parent displays the API error and keeps the form open. */ }
  }

  return <Dialog open onOpenChange={open => !open && !pending && onClose()}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>{item ? "Editar item" : "Adicionar à lista"}</DialogTitle>
        <DialogDescription>Só o link é obrigatório. Acrescente os detalhes que já tiver.</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="space-y-5">
        <Field label="Link de compra *" id="shopping-url"><Input id="shopping-url" type="url" autoFocus required maxLength={4000} value={draft.url} onChange={e => set("url", e.target.value)} placeholder="https://loja.com.br/produto" /></Field>
        <Field label="Nome ou descrição" id="shopping-title"><Input id="shopping-title" maxLength={240} value={draft.title} onChange={e => set("title", e.target.value)} placeholder="Ex.: 20 caixas de luvas tamanho M" /></Field>
        <button type="button" className="flex w-full items-center justify-between rounded-xl border bg-muted/20 p-3 text-left text-sm font-medium hover:bg-muted/40" aria-expanded={details} onClick={() => setDetails(!details)}>
          Detalhes opcionais <span aria-hidden>{details ? "−" : "+"}</span>
        </button>
        {details && <div className="space-y-4 rounded-xl border bg-muted/10 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ordem de compra" id="shopping-order">
              <Select value={draft.purchaseOrderId || "NONE"} onValueChange={value => setDraft(current => ({ ...current, purchaseOrderId: value === "NONE" ? "" : value, purchaseOrderItemId: "", productId: current.productId }))}>
                <SelectTrigger id="shopping-order" className="w-full"><SelectValue placeholder="Sem OC" /></SelectTrigger>
                <SelectContent><SelectItem value="NONE">Sem OC / compra avulsa</SelectItem>{orders.map(order => <SelectItem key={order.id} value={order.id}>OC {order.orderNumber} · {order.customer.tradeName || order.customer.legalName}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Item da OC" id="shopping-destination">
              <Select disabled={!draft.purchaseOrderId || isFetchingOrder} value={draft.purchaseOrderItemId || "NONE"} onValueChange={value => {
                const line = order?.items.find(line => line.id === value);
                setDraft(current => ({ ...current, purchaseOrderItemId: value === "NONE" ? "" : value,
                  productId: line?.productId ?? current.productId, quantity: current.quantity || (line?.purchasePendingQuantity ? String(line.purchasePendingQuantity) : "") }));
              }}>
                <SelectTrigger id="shopping-destination" className="w-full"><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent><SelectItem value="NONE">Sem item específico</SelectItem>{order?.items.filter(line => line.id).map(line => <SelectItem key={line.id} value={line.id!}>{line.lineNumber}. {line.description}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <div className="space-y-2"><Label>Produto do catálogo</Label><div className="flex gap-2"><ProductCombobox products={products} value={draft.productId} placeholder="Selecione um produto (opcional)" onValueChange={productId => setDraft(current => ({ ...current, productId: productId ?? "", purchaseOrderItemId: current.productId === productId ? current.purchaseOrderItemId : "" }))} />
            {draft.productId && <Button type="button" variant="outline" onClick={() => setDraft(current => ({ ...current, productId: "", purchaseOrderItemId: "" }))}>Limpar</Button>}</div></div>
          {(ordersError || productsError) && <p className="text-sm text-amber-300">Não foi possível carregar todos os cadastros. Você ainda pode salvar apenas o link.</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quantidade" id="shopping-quantity"><Input id="shopping-quantity" type="number" step="0.001" min="0.001" value={draft.quantity} onChange={e => set("quantity", e.target.value)} placeholder="Ainda não definida" /></Field>
            <Field label="Preço estimado por unidade (R$)" id="shopping-price"><Input id="shopping-price" type="number" step="0.000001" min="0" value={draft.estimatedUnitPrice} onChange={e => set("estimatedUnitPrice", e.target.value)} placeholder="Ainda não pesquisado" /></Field>
            <Field label="Fornecedor ou loja" id="shopping-seller"><Input id="shopping-seller" maxLength={160} value={draft.sellerName} onChange={e => set("sellerName", e.target.value)} placeholder="Ex.: Mercado Livre" /></Field>
            <Field label="Comprar até" id="shopping-date"><Input id="shopping-date" type="date" value={draft.neededBy} onChange={e => set("neededBy", e.target.value)} /></Field>
            <Field label="Prioridade" id="shopping-priority"><Select value={draft.priority} onValueChange={value => set("priority", value)}><SelectTrigger id="shopping-priority" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NORMAL">Normal</SelectItem><SelectItem value="HIGH">Alta</SelectItem><SelectItem value="URGENT">Urgente</SelectItem></SelectContent></Select></Field>
          </div>
          <Field label="Observações" id="shopping-notes"><Textarea id="shopping-notes" maxLength={4000} value={draft.notes} onChange={e => set("notes", e.target.value)} placeholder="Cor, tamanho, variação, instruções para comprar..." /></Field>
        </div>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancelar</Button><Button type="submit" isLoading={pending}>{item ? "Salvar item" : "Adicionar item"}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label>{children}</div>;
}
