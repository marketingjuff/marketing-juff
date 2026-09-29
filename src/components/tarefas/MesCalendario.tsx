import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ListaCards } from "./ListaCards";
import { estaAtrasado, isoDe, type CardComContexto } from "@/lib/tarefas";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function MesCalendario({
  ano,
  mes,
  cards,
  onMudarMes,
  onAbrir,
}: {
  ano: number;
  mes: number;
  cards: CardComContexto[];
  onMudarMes: (ano: number, mes: number) => void;
  onAbrir: (card: CardComContexto) => void;
}) {
  const [dia, setDia] = useState<string | null>(null);
  const primeiro = new Date(ano, mes, 1);
  const inicio = new Date(ano, mes, 1 - primeiro.getDay());
  const celulas = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    return d;
  });
  const hoje = isoDe(new Date());
  const porDia = new Map<string, CardComContexto[]>();
  for (const c of cards) {
    if (!c.data_entrega) continue;
    porDia.set(c.data_entrega, [...(porDia.get(c.data_entrega) ?? []), c]);
  }

  function mover(delta: number) {
    const d = new Date(ano, mes + delta, 1);
    onMudarMes(d.getFullYear(), d.getMonth());
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button size="icon" variant="outline" className="size-8" aria-label="Mês anterior" onClick={() => mover(-1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button size="icon" variant="outline" className="size-8" aria-label="Próximo mês" onClick={() => mover(1)}>
          <ChevronRight className="size-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => onMudarMes(new Date().getFullYear(), new Date().getMonth())}>
          Hoje
        </Button>
        <h2 className="ml-2 text-lg font-semibold">
          {MESES[mes]} {ano}
        </h2>
      </div>

      <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-border bg-card">
        {DIAS.map((d) => (
          <div key={d} className="border-b border-border bg-secondary/50 py-1.5 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {celulas.map((d) => {
          const iso = isoDe(d);
          const doMes = d.getMonth() === mes;
          const lista = porDia.get(iso) ?? [];
          return (
            <button
              key={iso}
              type="button"
              onClick={() => setDia(iso)}
              className={cn(
                "flex min-h-24 flex-col gap-0.5 border-b border-r border-border p-1 text-left hover:bg-secondary/40",
                !doMes && "bg-muted/30 text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "self-end rounded-full px-1.5 text-xs tabular-nums",
                  iso === hoje && "bg-primary text-primary-foreground",
                )}
              >
                {d.getDate()}
              </span>
              {lista.slice(0, 3).map((c) => (
                <span
                  key={c.id}
                  className={cn(
                    "truncate rounded bg-primary-soft px-1 text-[11px]",
                    estaAtrasado(c) && "bg-destructive/15 text-destructive",
                    c.concluido && "line-through opacity-60",
                  )}
                >
                  {c.titulo || "Sem título"}
                </span>
              ))}
              {lista.length > 3 ? (
                <span className="text-[11px] text-muted-foreground">+{lista.length - 3}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <Sheet open={!!dia} onOpenChange={(v) => !v && setDia(null)}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {dia ? dia.split("-").reverse().join("/") : ""}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <ListaCards cards={dia ? porDia.get(dia) ?? [] : []} onAbrir={onAbrir} vazio="Nenhuma entrega neste dia." />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
