import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function QuickLinksDialog({ pending, onClose, onSave }: { pending: boolean; onClose: () => void; onSave: (urls: string[]) => Promise<void> }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  return <Dialog open onOpenChange={open => !open && !pending && onClose()}><DialogContent>
    <DialogHeader><DialogTitle>Colar vários links</DialogTitle><DialogDescription>Um link por linha, até 100 por vez. Os detalhes podem ser preenchidos depois.</DialogDescription></DialogHeader>
    <form className="space-y-4" onSubmit={async event => {
      event.preventDefault();
      const urls = [...new Set(value.split(/\r?\n/).map(url => url.trim()).filter(Boolean))];
      if (!urls.length || urls.length > 100) { setError("Cole de 1 a 100 links, um por linha."); return; }
      const invalid = urls.findIndex(url => { try { const parsed = new URL(url); return url.length > 4000 || !["http:", "https:"].includes(parsed.protocol) || Boolean(parsed.username || parsed.password); } catch { return true; } });
      if (invalid >= 0) { setError(`O link ${invalid + 1} é inválido. Use o endereço completo começando com https://.`); return; }
      setError("");
      try { await onSave(urls); onClose(); } catch { /* Parent displays the API error. */ }
    }}>
      <div className="space-y-2"><Label htmlFor="quick-links">Links de compra</Label><Textarea id="quick-links" autoFocus required value={value} onChange={e => setValue(e.target.value)} className="min-h-48" placeholder={"https://loja.com.br/produto-1\nhttps://loja.com.br/produto-2"} /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancelar</Button><Button type="submit" isLoading={pending}>Adicionar links</Button></div>
    </form>
  </DialogContent></Dialog>;
}
