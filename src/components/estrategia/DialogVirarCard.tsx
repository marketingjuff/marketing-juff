import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { colunasQueryOptions, pessoasQueryOptions, quadrosQueryOptions } from "@/lib/tarefas";
import { decisaoVirarCard, type DecisaoEstrategia } from "@/lib/estrategia";

const NINGUEM = "__ninguem__";

export function DialogVirarCard({
  decisao,
  open,
  onOpenChange,
  contexto,
  onCriado,
}: {
  decisao: DecisaoEstrategia | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contexto: string;
  onCriado: (cardId: string) => void;
}) {
  const [quadroId, setQuadroId] = useState("");
  const [colunaId, setColunaId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [responsavel, setResponsavel] = useState<string>(NINGUEM);
  const [prazo, setPrazo] = useState("");
  const [salvando, setSalvando] = useState(false);

  const { data: quadros = [] } = useQuery({ ...quadrosQueryOptions, enabled: open });
  const { data: colunas = [] } = useQuery({ ...colunasQueryOptions(quadroId), enabled: open && !!quadroId });
  const { data: pessoas = [] } = useQuery({ ...pessoasQueryOptions, enabled: open });

  useEffect(() => {
    if (!open || !decisao) return;
    setTitulo(decisao.texto);
    setResponsavel(decisao.responsavel_id ?? NINGUEM);
    setPrazo(decisao.prazo ?? "");
    setQuadroId("");
    setColunaId("");
  }, [open, decisao?.id]);

  useEffect(() => {
    if (colunas.length && !colunas.some((c) => c.id === colunaId)) setColunaId(colunas[0].id);
  }, [colunas, colunaId]);

  if (!decisao) return null;

  async function confirmar() {
    if (!quadroId || !colunaId || !titulo.trim()) {
      toast.error("Escolha quadro, coluna e escreva o título");
      return;
    }
    setSalvando(true);
    try {
      const id = await decisaoVirarCard({
        decisaoId: decisao.id,
        quadroId,
        colunaId,
        titulo: titulo.trim(),
        descricao: `Decisão da ata de ${contexto}.`,
        responsavelId: responsavel === NINGUEM ? null : responsavel,
        dataEntrega: prazo || null,
      });
      onCriado(id);
      toast.success("Card criado em Tarefas");
      onOpenChange(false);
    } catch {
      toast.error("Não deu para criar o card");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transformar decisão em card</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Título do card</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Quadro</Label>
            <Select value={quadroId} onValueChange={setQuadroId}>
              <SelectTrigger><SelectValue placeholder="Escolha o quadro" /></SelectTrigger>
              <SelectContent>
                {quadros.map((q) => <SelectItem key={q.id} value={q.id}>{q.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Coluna</Label>
            <Select value={colunaId} onValueChange={setColunaId} disabled={!quadroId}>
              <SelectTrigger><SelectValue placeholder="Escolha a coluna" /></SelectTrigger>
              <SelectContent>
                {colunas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Responsável</Label>
              <Select value={responsavel} onValueChange={setResponsavel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NINGUEM}>Ninguém</SelectItem>
                  {pessoas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Entrega</Label>
              <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button size="sm" onClick={confirmar} disabled={salvando}>Criar card</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
