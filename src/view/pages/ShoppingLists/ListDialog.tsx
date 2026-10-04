import { useState } from "react";
import type { ShoppingList } from "@/app/entities/ShoppingList";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ListDialog({ list, pending, onClose, onSave }: {
  list?: ShoppingList; pending: boolean; onClose: () => void;
  onSave: (input: { name: string; notes: string | null }) => Promise<void>;
}) {
  const [name, setName] = useState(list?.name ?? "");
  const [notes, setNotes] = useState(list?.notes ?? "");
  return <Dialog open onOpenChange={open => !open && !pending && onClose()}><DialogContent>
    <DialogHeader><DialogTitle>{list ? "Editar lista" : "Nova lista de compras"}</DialogTitle><DialogDescription>Organize os links da equipe por semana, cliente ou como preferir.</DialogDescription></DialogHeader>
    <form className="space-y-4" onSubmit={async event => { event.preventDefault(); if (!name.trim()) return; try { await onSave({ name: name.trim(), notes: notes.trim() || null }); onClose(); } catch { /* Parent displays the API error. */ } }}>
      <div className="space-y-2"><Label htmlFor="list-name">Nome da lista *</Label><Input id="list-name" required autoFocus maxLength={160} value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Compras da semana" /></div>
      <div className="space-y-2"><Label htmlFor="list-notes">Observações (opcional)</Label><Textarea id="list-notes" maxLength={4000} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Orientações para quem vai comprar" /></div>
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancelar</Button><Button type="submit" isLoading={pending}>{list ? "Salvar lista" : "Criar lista"}</Button></div>
    </form>
  </DialogContent></Dialog>;
}
