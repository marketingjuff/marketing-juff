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
  for (const [dia, lista] of porDia) {
    porDia.set(dia, [...lista].sort((a, b) => (a.hora_entrega ?? "").localeCompare(b.hora_entrega ?? "")));
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

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {topo.length ? (
          <div className="space-y-0.5 border-b-2 border-border bg-secondary/60 p-1">
            {topo.map((c) => {
              const corte0 = (c.data_inicio ?? "") < gradeIni;
              const corte1 = (c.data_entrega ?? "") > gradeFim;
              const st = estiloBarra(c);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onAbrir(c)}
                  className={cn(
                    "block w-full truncate px-1.5 py-0.5 text-left text-[11px]",
                    st.className,
                    corte0 ? "rounded-l-none" : "rounded-l",
                    corte1 ? "rounded-r-none" : "rounded-r",
                  )}
                  style={st.style}
                >
                  {c.titulo || "Sem título"}
                  <span className="ml-2 opacity-75">
                    {fmtCurto(c.data_inicio)} – {fmtCurto(c.data_entrega)}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
        <div className="grid grid-cols-7">
          {DIAS.map((d) => (
            <div key={d} className="border-b border-border bg-secondary/50 py-1.5 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        {semanas.map((sem, wi) => {
          const faixas = montarFaixasSemana(naGrade, sem.map(isoDe));
          return (
            <div
              key={wi}
              ref={wi === 0 ? semanaRef : undefined}
              className="relative min-h-24 border-b border-border"
              style={{ height: Math.max(96, 24 + faixas.length * 22 + 6) }}
            >
              <div className="absolute inset-0 grid grid-cols-7">
                {sem.map((d) => {
                  const iso = isoDe(d);
                  const doMes = d.getMonth() === mes;
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setDia(iso)}
                      className={cn(
                        "flex flex-col border-r border-border p-1 text-left hover:bg-secondary/40",
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
                    </button>
                  );
                })}
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-6 space-y-0.5 px-1">
                {faixas.map((fx, fi) => (
                  <div key={fi} className="grid h-5 grid-cols-7 gap-x-2">
                    {fx.map((s) => {
                      const c = s.card;
                      const st = estiloBarra(c);
                      const arrasta = podeArrastar && !c.concluido;
                      return (
                        <div
                          key={c.id}
                          role="button"
                          tabIndex={0}
                          onPointerDown={(e) => iniciar(e, c, "corpo")}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!arrasta) onAbrir(c);
                          }}
                          onKeyDown={(e) => e.key === "Enter" && onAbrir(c)}
                          className={cn(
                            "pointer-events-auto relative flex items-center truncate px-1 text-[11px] leading-5 select-none",
                            st.className,
                            s.cortadoEsq ? "rounded-l-none" : "rounded-l",
                            s.cortadoDir ? "rounded-r-none" : "rounded-r",
                            arrasta && "cursor-move touch-none",
                          )}
                          style={{ ...st.style, gridColumn: `${s.colIni + 1} / ${s.colFim + 2}` }}
                        >
                          {arrasta && !s.cortadoEsq ? (
                            <span
                              className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize"
                              onPointerDown={(e) => iniciar(e, c, "esq")}
                            />
                          ) : null}
                          <span className="truncate">
                            {!c.data_inicio && c.hora_entrega ? (
                              <span className="mr-1 tabular-nums opacity-70">{c.hora_entrega.slice(0, 5)}</span>
                            ) : null}
                            {c.titulo || "Sem título"}
                          </span>
                          {arrasta && !s.cortadoDir ? (
                            <span
                              className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize"
                              onPointerDown={(e) => iniciar(e, c, "dir")}
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
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
