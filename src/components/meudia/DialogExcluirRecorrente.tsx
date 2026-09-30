import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function DialogExcluirRecorrente({
  open,
  onOpenChange,
  descricao,
  onSoEsteDia,
  onEsteEProximos,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  descricao: string;
  onSoEsteDia: () => void;
  onEsteEProximos: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Tirar da grade</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {descricao} se repete. O que você quer tirar?
        </p>
        <div className="mt-2 space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              onSoEsteDia();
              onOpenChange(false);
            }}
          >
            Só este dia
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              onEsteEProximos();
              onOpenChange(false);
            }}
          >
            Este e os próximos
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Este e os próximos não apaga o que já passou, apenas para de gerar daqui para frente.
        </p>
      </DialogContent>
    </Dialog>
  );
}
