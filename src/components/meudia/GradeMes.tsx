import { Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BLOCOS_POR_DIA, NOMES_DIA, NOMES_MES, mesDe, semanasDoMes,
  type ItemDia,
} from "@/lib/meudia";

export function GradeMes({
  ano,
  mes,
  itens,
  feriados,
  hojeIso,
  onAbrirBloco,
  onAlternarFeito,
  onExcluir,
}: {
  ano: number;
  mes: number;
  itens: ItemDia[];
  feriados: Record<string, string>;
  hojeIso: string;
  onAbrirBloco: (dataIso: string, bloco: number) => void;
  onAlternarFeito: (item: ItemDia) => void;
  onExcluir: (item: ItemDia) => void;
}) {
  const semanas = semanasDoMes(ano, mes);

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide">
        {NOMES_MES[mes - 1]} {ano}
      </h2>

      <div className="space-y-2">
        {semanas.map((semana, si) => (
          <div key={si} className="grid grid-cols-5 gap-2">
            {semana.map((dataIso, di) => {
              const foraDoMes = mesDe(dataIso) !== mes;
              const feriado = feriados[dataIso];
              const doDia = itens.filter((i) => i.data === dataIso);
              const cobertos = new Set<number>();
              for (const i of doDia) {
                for (let b = i.bloco_inicio + 1; b < i.bloco_inicio + i.blocos; b++) cobertos.add(b);
              }

              return (
                <div
                  key={dataIso}
                  className={cn(
                    "min-w-0 rounded-lg border p-1.5",
                    foraDoMes && "opacity-35",
                    feriado ? "border-border bg-muted" : "border-border bg-card",
                    dataIso === hojeIso && "border-primary",
                  )}
                >
                  <p className="mb-1 flex items-baseline gap-1.5">
                    <span className="text-sm font-semibold">{Number(dataIso.slice(8, 10))}</span>
                    <span className="text-[10px] tracking-wide text-muted-foreground">{NOMES_DIA[di]}</span>
                  </p>

                  {feriado ? (
                    <p className="px-1 py-2 text-[11px] text-muted-foreground">{feriado}</p>
                  ) : (
                    <div className="space-y-1">
                      {Array.from({ length: BLOCOS_POR_DIA }, (_, k) => k + 1).map((bloco) => {
                        if (cobertos.has(bloco)) return null;
                        const item = doDia.find((i) => i.bloco_inicio === bloco);

                        if (!item) {
                          return (
                            <button
                              key={bloco}
                              type="button"
                              disabled={foraDoMes}
                              onClick={() => onAbrirBloco(dataIso, bloco)}
                              className="h-7 w-full rounded border border-dashed border-border text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                              aria-label={`Encaixar no bloco ${bloco} de ${dataIso}`}
                            />
                          );
                        }

                        return (
                          <div
                            key={bloco}
                            className={cn(
                              "group relative flex items-start gap-1 rounded border border-border bg-secondary/60 px-1.5 py-1",
                              item.feito && "opacity-55",
                            )}
                            style={{ minHeight: `${item.blocos * 1.75}rem` }}
                          >
                            <button
                              type="button"
                              onClick={() => onAlternarFeito(item)}
                              className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                              aria-label="Marcar como feito"
                            >
                              <Check className={cn("size-3", item.feito && "text-success")} />
                            </button>
                            <span className={cn("min-w-0 flex-1 break-words text-[11px] leading-tight", item.feito && "line-through")}>
                              {item.texto}
                            </span>
                            <button
                              type="button"
                              onClick={() => onExcluir(item)}
                              className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                              aria-label="Tirar do bloco"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
