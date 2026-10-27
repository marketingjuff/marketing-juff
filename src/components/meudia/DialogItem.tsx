import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { meusCardsQueryOptions } from "@/lib/tarefas";
import { criarRecorrente, recorrentesQueryOptions } from "@/lib/meudia";

type Origem = "livre" | "card" | "recorrente";

export function DialogItem({
  open,
  onOpenChange,
  dataIso,
  bloco,
  livres,
  userId,
  onConfirmar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  dataIso: string;
  bloco: number;
  livres: number;
  userId: string;
  onConfirmar: (dados: {
    texto: string;
    blocos: number;
    card_id: string | null;
    recorrente_id: string | null;
  }) => void;
}) {
  const [origem, setOrigem] = useState<Origem>("livre");
  const [texto, setTexto] = useState("");
  const [blocos, setBlocos] = useState(1);
  const [cardId, setCardId] = useState("");
  const [recId, setRecId] = useState("");
  const [criandoRec, setCriandoRec] = useState(false);
  const [novoRec, setNovoRec] = useState("");
  const [salvandoRec, setSalvandoRec] = useState(false);

  const { data: cards = [] } = useQuery({ ...meusCardsQueryOptions(userId), enabled: open });
  const { data: recorrentes = [], refetch: atualizarRecorrentes } = useQuery({ ...recorrentesQueryOptions, enabled: open });

  useEffect(() => {
    if (!open) return;
    setOrigem("livre");
    setTexto("");
    setBlocos(1);
    setCardId("");
    setRecId("");
    setCriandoRec(false);
    setNovoRec("");
  }, [open, dataIso, bloco]);

  async function adicionarRecorrente(): Promise<void> {
    const descricao = novoRec.trim();
    if (!descricao || salvandoRec) return;
    setSalvandoRec(true);
    try {
      const idsExistentes = new Set(recorrentes.map((r) => r.id));
      await criarRecorrente(descricao, recorrentes.length + 1);
      const atualizados = await atualizarRecorrentes();
      const criado = atualizados.data?.find((r) => !idsExistentes.has(r.id) && r.descricao === descricao);
      if (criado) setRecId(criado.id);
      setNovoRec("");
      setCriandoRec(false);
      toast.success("Recorrente criado");
    } catch {
      toast.error("Não deu para criar o recorrente");
    } finally {
      setSalvandoRec(false);
    }
  }

  function confirmar(): void {
    if (origem === "livre") {
      if (!texto.trim()) { toast.error("Escreva alguma coisa"); return; }
      onConfirmar({ texto: texto.trim(), blocos, card_id: null, recorrente_id: null });
    }
    if (origem === "card") {
      const c = cards.find((x) => x.id === cardId);
      if (!c) { toast.error("Escolha um card"); return; }
      onConfirmar({ texto: c.titulo, blocos, card_id: c.id, recorrente_id: null });
    }
    if (origem === "recorrente") {
      const r = recorrentes.find((x) => x.id === recId);
      if (!r) { toast.error("Escolha um recorrente"); return; }
      onConfirmar({ texto: r.descricao, blocos: Math.min(r.blocos, livres), card_id: null, recorrente_id: r.id });
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!salvandoRec) onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Encaixar no bloco {bloco}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex overflow-hidden rounded-lg border border-border">
            {(["livre", "card", "recorrente"] as Origem[]).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOrigem(o)}
                className={
                  "flex-1 px-3 py-1.5 text-xs font-medium transition-colors " +
                  (origem === o ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")
                }
              >
                {o === "livre" ? "Texto livre" : o === "card" ? "Card" : "Recorrente"}
              </button>
            ))}
          </div>

          {origem === "livre" ? (
            <div className="space-y-1">
              <Label className="text-xs">O que você vai fazer</Label>
              <Input value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus />
            </div>
          ) : null}

          {origem === "card" ? (
            <div className="space-y-1">
              <Label className="text-xs">Card atribuído a você</Label>
              <Select value={cardId} onValueChange={setCardId}>
                <SelectTrigger><SelectValue placeholder="Escolha o card" /></SelectTrigger>
                <SelectContent>
                  {cards.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.titulo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {origem === "recorrente" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">Recorrente</Label>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" disabled={salvandoRec} onClick={() => setCriandoRec(true)}>
                  <Plus className="size-3.5" /> Novo recorrente
                </Button>
              </div>
              <Select value={recId} onValueChange={setRecId}>
                <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
                <SelectContent>
                  {recorrentes.filter((r) => r.ativo).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.descricao} · {r.blocos} bloco{r.blocos > 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {criandoRec ? (
                <form className="space-y-2 border-t border-border pt-3" onSubmit={(e) => { e.preventDefault(); void adicionarRecorrente(); }}>
                  <Label htmlFor="novo-recorrente" className="text-xs">Nome do recorrente novo</Label>
                  <Input id="novo-recorrente" value={novoRec} onChange={(e) => setNovoRec(e.target.value)} disabled={salvandoRec} autoFocus />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" disabled={salvandoRec} onClick={() => { setCriandoRec(false); setNovoRec(""); }}>Voltar</Button>
                    <Button type="submit" variant="outline" size="sm" className="gap-1" disabled={salvandoRec || !novoRec.trim()}>
                      <Plus className="size-4" /> {salvandoRec ? "Criando…" : "Adicionar"}
                    </Button>
                  </div>
                </form>
              ) : null}
            </div>
          ) : null}

          {origem !== "recorrente" ? (
            <div className="space-y-1">
              <Label className="text-xs">Quantos blocos ocupa</Label>
              <Select value={String(blocos)} onValueChange={(v) => setBlocos(Number(v))}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: livres }, (_, i) => i + 1).map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n === 4 ? "Dia inteiro" : `${n} bloco${n > 1 ? "s" : ""}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" disabled={salvandoRec} onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button size="sm" disabled={salvandoRec || (origem === "recorrente" && criandoRec)} onClick={confirmar}>Encaixar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
