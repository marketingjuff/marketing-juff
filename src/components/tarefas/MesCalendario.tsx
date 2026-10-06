import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ListaCards } from "./ListaCards";
import {
  cardsDoMesQueryOptions,
  corTextoContraste,
  diasFaixaTopoQueryOptions,
  duracaoDias,
  estaAtrasado,
  isoDe,
  montarFaixasSemana,
  somarDiasIso,
  updateCard,
  type CardComContexto,
} from "@/lib/tarefas";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type Modo = "esq" | "dir" | "corpo";

function fmtCurto(iso: string | null): string {
  if (!iso) return "";
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1].slice(0, 3).toLowerCase()}`;
}

function estiloBarra(c: CardComContexto): { className: string; style?: React.CSSProperties } {
  const fim = c.concluido ? " line-through opacity-60" : "";
  if (estaAtrasado(c)) return { className: "bg-destructive/15 text-destructive" + fim };
  if (c.quadro_cor) return { className: fim, style: { background: c.quadro_cor, color: corTextoContraste(c.quadro_cor) } };
  return { className: "bg-primary-soft" + fim };
}

/** Novas datas a partir do arrasto, com travas início ≤ entrega. */
function datasArrastadas(c: CardComContexto, modo: Modo, d: number) {
  const ini = c.data_inicio;
  const ent = c.data_entrega!;
  if (modo === "corpo") return { data_inicio: ini ? somarDiasIso(ini, d) : null, data_entrega: somarDiasIso(ent, d) };
  if (modo === "dir") {
    let novo = somarDiasIso(ent, d);
    if (ini && novo < ini) novo = ini;
    if (!ini) return { data_inicio: null, data_entrega: novo };
    return { data_inicio: ini, data_entrega: novo };
  }
  if (!ini) return { data_inicio: d < 0 ? somarDiasIso(ent, d) : null, data_entrega: ent };
  let novo = somarDiasIso(ini, d);
  if (novo > ent) novo = ent;
  return { data_inicio: novo, data_entrega: ent };
}

export function MesCalendario({
  ano,
  mes,
  cards,
  onMudarMes,
  onAbrir,
  podeArrastar = false,
}: {
  ano: number;
  mes: number;
  cards: CardComContexto[];
  onMudarMes: (ano: number, mes: number) => void;
  onAbrir: (card: CardComContexto) => void;
  podeArrastar?: boolean;
}) {
  const qc = useQueryClient();
  const [dia, setDia] = useState<string | null>(null);
  const { data: limite = 20 } = useQuery(diasFaixaTopoQueryOptions);
  const semanaRef = useRef<HTMLDivElement>(null);
  const [arrasto, setArrasto] = useState<{ id: string; modo: Modo; delta: number } | null>(null);
  const primeiro = new Date(ano, mes, 1);
  const inicio = new Date(ano, mes, 1 - primeiro.getDay());
  const celulas = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    return d;
  });
  const semanas = Array.from({ length: 6 }, (_, i) => celulas.slice(i * 7, i * 7 + 7));
  const gradeIni = isoDe(celulas[0]);
  const gradeFim = isoDe(celulas[41]);
  const hoje = isoDe(new Date());
  const porDia = new Map<string, CardComContexto[]>();
  for (const c of cards) {
    if (!c.data_entrega) continue;
    porDia.set(c.data_entrega, [...(porDia.get(c.data_entrega) ?? []), c]);
  }
  for (const [dia, lista] of porDia) {
    porDia.set(dia, [...lista].sort((a, b) => (a.hora_entrega ?? "").localeCompare(b.hora_entrega ?? "")));
  }

  // cards com prévia do arrasto aplicada
  const visiveis = cards
    .filter((c) => c.data_entrega)
    .map((c) => (arrasto && arrasto.id === c.id ? { ...c, ...datasArrastadas(c, arrasto.modo, arrasto.delta) } : c));
  const topo = visiveis
    .filter((c) => duracaoDias(c.data_inicio, c.data_entrega) > limite)
    .sort((a, b) => (a.data_inicio ?? "").localeCompare(b.data_inicio ?? ""));
  const idsTopo = new Set(topo.map((c) => c.id));
  const naGrade = visiveis
    .filter((c) => !idsTopo.has(c.id))
    .sort((a, b) => (a.hora_entrega ?? "").localeCompare(b.hora_entrega ?? ""));

  function iniciar(e: React.PointerEvent, c: CardComContexto, modo: Modo) {
    if (!podeArrastar || c.concluido || e.button !== 0) return;
    e.stopPropagation();
    const x0 = e.clientX;
    const y0 = e.clientY;
    const largura = (semanaRef.current?.offsetWidth ?? 700) / 7;
    const alturaSemana = semanaRef.current?.offsetHeight ?? 96;
    let delta = 0;
    let moveu = false;
    setArrasto({ id: c.id, modo, delta: 0 });
    const mover = (ev: PointerEvent) => {
      const dx = ev.clientX - x0;
      const dy = ev.clientY - y0;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moveu = true;
      const d = Math.round(dx / largura) + Math.round(dy / alturaSemana) * 7;
      if (d !== delta) {
        delta = d;
        setArrasto({ id: c.id, modo, delta: d });
      }
    };
    const soltar = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      setArrasto(null);
      if (!moveu) {
        onAbrir(c);
        return;
      }
      if (delta === 0) return;
      const novas = datasArrastadas(c, modo, delta);
      const mudou: { data_inicio?: string | null; data_entrega?: string } = {};
      if (novas.data_inicio !== c.data_inicio) mudou.data_inicio = novas.data_inicio;
      if (novas.data_entrega !== c.data_entrega) mudou.data_entrega = novas.data_entrega;
      if (!Object.keys(mudou).length) return;
      const chave = cardsDoMesQueryOptions(ano, mes).queryKey;
      const antes = qc.getQueryData<CardComContexto[]>(chave);
      qc.setQueryData<CardComContexto[]>(chave, (l) => l?.map((x) => (x.id === c.id ? { ...x, ...mudou } : x)));
      updateCard(c.id, mudou)
        .catch((err) => {
          qc.setQueryData(chave, antes);
          toast.error(err instanceof Error ? err.message : "Não foi possível mover o card");
        })
        .finally(() => {
          void qc.invalidateQueries({ queryKey: chave });
          void qc.invalidateQueries({ queryKey: ["tarefas", "quadro", c.quadro_id] });
        });
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
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
                  <div key={fi} className="grid h-5 grid-cols-7">
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
                            "pointer-events-auto relative mx-0.5 flex items-center truncate px-1 text-[11px] leading-5 select-none",
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
