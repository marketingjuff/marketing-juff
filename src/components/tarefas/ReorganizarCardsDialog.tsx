import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CriterioOrdem } from "@/lib/tarefas";

const CRITERIOS: { valor: CriterioOrdem; label: string }[] = [
  { valor: "entrega", label: "Data de entrega" },
  { valor: "prioridade", label: "Prioridade" },
  { valor: "responsavel", label: "Responsável" },
  { valor: "etiqueta", label: "Etiqueta" },
  { valor: "alfabetica", label: "Alfabética" },
];

export function ReorganizarCardsDialog({
  open,
  onOpenChange,
  colunaNome,
  onAplicar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  colunaNome: string;
  onAplicar: (criterio: CriterioOrdem, decrescente: boolean) => void;
}) {
  const [criterio, setCriterio] = useState<CriterioOrdem>("entrega");
  const [decrescente, setDecrescente] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reorganizar cards</DialogTitle>
          <DialogDescription>{colunaNome}</DialogDescription>
        </DialogHeader>
        <RadioGroup value={criterio} onValueChange={(v) => setCriterio(v as CriterioOrdem)}>
          {CRITERIOS.map((c) => (
            <div key={c.valor} className="flex items-center gap-2">
              <RadioGroupItem id={`ord-${c.valor}`} value={c.valor} />
              <Label htmlFor={`ord-${c.valor}`} className="font-normal">{c.label}</Label>
            </div>
          ))}
        </RadioGroup>
        <label className="flex items-center gap-2 text-sm">
          <span className={decrescente ? "text-muted-foreground" : "font-medium"}>Crescente</span>
          <Switch checked={decrescente} onCheckedChange={setDecrescente} />
          <span className={decrescente ? "font-medium" : "text-muted-foreground"}>Decrescente</span>
        </label>
        <p className="text-xs text-muted-foreground">
          A nova ordem é gravada e vale para todo mundo que vê o quadro.
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => {
              onAplicar(criterio, decrescente);
              onOpenChange(false);
            }}
          >
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
