import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { REGRAS_RESPONSAVEL, updateColuna, type Coluna } from "@/lib/tarefas";

export function ColunaResponsavelDialog({
  coluna,
  colunas,
  aberto,
  onFechar,
  onSalvo,
}: {
  coluna: Coluna | null;
  colunas: Coluna[];
  aberto: boolean;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [regra, setRegra] = useState<Coluna["resp_ao_entrar"]>("padrao");
  const [origem, setOrigem] = useState<string>("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto || !coluna) return;
    setRegra(coluna.resp_ao_entrar);
    setOrigem(coluna.resp_coluna_origem_id ?? "");
  }, [aberto, coluna]);

  const outras = colunas.filter((c) => c.id !== coluna?.id);
  const faltaOrigem = regra === "quem_ficou" && !origem;

  async function salvar() {
    if (!coluna || faltaOrigem) return;
    setSalvando(true);
    try {
      await updateColuna(coluna.id, {
        resp_ao_entrar: regra,
        resp_coluna_origem_id: regra === "quem_ficou" ? origem : null,
      });
      toast.success("Regra da coluna salva");
      onSalvo();
      onFechar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Responsável ao entrar em {coluna?.nome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {REGRAS_RESPONSAVEL.map((r) => (
            <button
              key={r.valor}
              type="button"
              onClick={() => setRegra(r.valor)}
              className={cn(
                "w-full rounded-lg border p-2.5 text-left",
                regra === r.valor ? "border-primary bg-primary-soft" : "border-border",
              )}
            >
              <span className="block text-sm font-medium">{r.rotulo}</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">{r.ajuda}</span>
            </button>
          ))}
        </div>

        {regra === "quem_ficou" ? (
          <div className="space-y-1.5">
            <Label>Buscar o responsável de qual coluna</Label>
            <Select value={origem} onValueChange={setOrigem}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Escolha a coluna" />
              </SelectTrigger>
              <SelectContent>
                {outras.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Se o card nunca passou por essa coluna, o responsável fica como está.
            </p>
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
          <Button disabled={salvando || faltaOrigem} onClick={salvar}>Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
