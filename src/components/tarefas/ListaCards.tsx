import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  coresDaEtiqueta,
  estaAtrasado,
  pessoasQueryOptions,
  etiquetasQueryOptions,
  formatarData,
  type CardComContexto,
} from "@/lib/tarefas";

export function ListaCards({
  cards,
  onAbrir,
  vazio = "Nenhum card aqui.",
}: {
  cards: CardComContexto[];
  onAbrir: (card: CardComContexto) => void;
  vazio?: string;
}) {
  const { data: etiquetas = [] } = useQuery(etiquetasQueryOptions);
  const { data: pessoas = [] } = useQuery(pessoasQueryOptions);
  const mapa = new Map(etiquetas.map((e) => [e.id, e]));
  if (cards.length === 0) return <p className="py-2 text-sm text-muted-foreground">{vazio}</p>;
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {cards.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            onClick={() => onAbrir(c)}
            className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-left hover:bg-secondary/60"
          >
            <span className={cn("min-w-0 flex-1 truncate text-sm", c.concluido && "line-through opacity-60")}>
              {c.titulo || "Sem título"}
            </span>
            <span className="text-xs text-muted-foreground">
              {c.quadro_nome} · {c.coluna_nome}
            </span>
            <span className="flex gap-1">
              {c.etiquetas.map((id) => {
                const e = mapa.get(id);
                return e ? (
                  <span
                    key={id}
                    className="rounded px-1.5 py-0.5 text-[10px]"
                    style={(() => { const cs = coresDaEtiqueta(e, pessoas); return { backgroundColor: cs.cor, color: cs.cor_texto }; })()}
                  >
                    {e.nome}
                  </span>
                ) : null;
              })}
            </span>
            {c.data_entrega ? (
              <span
                className={cn(
                  "text-xs tabular-nums",
                  estaAtrasado(c) ? "font-medium text-destructive" : "text-muted-foreground",
                )}
              >
                {formatarData(c.data_entrega)}
              </span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
