import { memo } from "react";
import { numeroCurto, type ItemPublicado } from "@/lib/calendario-social";

const VERDE = "#2e572d";
const LARANJA = "#e36837";
const ADS = "#d99400";

/** Ícones em desenho, medida exata de 9 pixels. Nunca emoji. */
function IconeCurtida() {
  return (
    <svg viewBox="0 0 24 24" width={9} height={9} fill="currentColor" className="shrink-0">
      <path d="M12 21s-7-4.6-9.3-8.4C.9 9.9 2.3 6 5.8 6 8 6 9.4 7.2 12 10c2.6-2.8 4-4 6.2-4 3.5 0 4.9 3.9 3.1 6.6C19 16.4 12 21 12 21z" />
    </svg>
  );
}
function IconeComentario() {
  return (
    <svg viewBox="0 0 24 24" width={9} height={9} fill="currentColor" className="shrink-0">
      <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4V6a2 2 0 0 1 2-2z" />
    </svg>
  );
}
function IconeVisualizacao() {
  return (
    <svg viewBox="0 0 24 24" width={9} height={9} fill="currentColor" className="shrink-0">
      <path d="M12 5C6 5 2 12 2 12s4 7 10 7 10-7 10-7-4-7-10-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
    </svg>
  );
}
function IconeResposta() {
  return (
    <svg viewBox="0 0 24 24" width={9} height={9} fill="currentColor" className="shrink-0">
      <path d="M10 9V5l-8 7 8 7v-4c5 0 8 1.5 10 5-1-5-4-10-10-11z" />
    </svg>
  );
}

const CAIXA =
  "group relative w-[62px] h-[94px] shrink-0 overflow-hidden rounded-md border border-border bg-card cursor-pointer";
const FAIXA_CIMA =
  "flex h-[14px] items-center justify-between overflow-hidden whitespace-nowrap px-1 text-[7.5px] font-extrabold uppercase leading-none tracking-wide text-white";
const CAPA = "relative h-[60px] overflow-hidden";
const FAIXA_BAIXO = "grid h-[18px] grid-cols-2 text-[9px] font-bold leading-none";
const METADE =
  "flex min-w-0 items-center justify-center gap-[3px] overflow-hidden whitespace-nowrap bg-secondary text-muted-foreground";

/** Três letras do formato, para caber na faixa de cima. */
function sigla(formato: string) {
  const f = formato.toUpperCase();
  if (f.includes("CAROUSEL")) return "car";
  if (f.includes("VIDEO")) return "reels";
  if (f.includes("STORY")) return "sto";
  return "feed";
}

/** Um post publicado, lido do Instagram. */
export const CardPublicado = memo(function CardPublicado({
  item, capa, onAbrir,
}: {
  item: ItemPublicado;
  capa: string | undefined;
  onAbrir: (item: ItemPublicado) => void;
}) {
  return (
    <div className={CAIXA} onClick={() => onAbrir(item)} role="button" tabIndex={0}>
      <div className={FAIXA_CIMA} style={{ backgroundColor: VERDE }}>
        <span>{sigla(item.formato)}</span>
        {item.ads ? (
          <span className="rounded-[2px] px-[3px]" style={{ backgroundColor: ADS }}>ads</span>
        ) : null}
      </div>

      <div className={CAPA}>
        {capa ? (
          <img src={capa} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full w-full bg-secondary" />
        )}
        <div className="absolute inset-0 hidden overflow-hidden bg-black/60 p-1 text-[8.5px] leading-tight text-white group-hover:block">
          {item.legenda || "sem legenda"}
        </div>
      </div>

      <div className={FAIXA_BAIXO}>
        <span className={METADE}><IconeCurtida />{numeroCurto(item.curtidas)}</span>
        <span className={`${METADE} border-l border-border`}>
          <IconeComentario />{numeroCurto(item.comentarios)}
        </span>
      </div>
    </div>
  );
});

/** Todos os stories de um dia em um card só. */
export const CardStories = memo(function CardStories({
  itens, capas, onAbrir,
}: {
  itens: ItemPublicado[];
  capas: Record<string, string>;
  onAbrir: (itens: ItemPublicado[]) => void;
}) {
  if (!itens.length) return null;
  const total = itens.length;
  const vistas = itens.reduce((s, i) => s + i.visualizacoes, 0);
  const respostas = itens.reduce((s, i) => s + i.respostas, 0);
  const tres = itens.slice(0, 3);

  return (
    <div className={CAIXA} onClick={() => onAbrir(itens)} role="button" tabIndex={0}>
      <div className={FAIXA_CIMA} style={{ backgroundColor: LARANJA }}>
        <span>sto</span>
        <span>{total}</span>
      </div>

      <div className={CAPA}>
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          {tres.map((i) => {
            const url = capas[i.capa_path];
            return url ? (
              <img key={i.id} src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div key={i.id} className="h-full w-full bg-secondary" />
            );
          })}
          <div className="flex items-center justify-center bg-black/55 text-[11px] font-extrabold text-white">
            {total > 3 ? `+${total - 3}` : ""}
          </div>
        </div>
        <div className="absolute inset-0 hidden overflow-hidden bg-black/60 p-1 text-[8.5px] leading-tight text-white group-hover:block">
          {total} stories neste dia. Clique para ver a fileira.
        </div>
      </div>

      <div className={FAIXA_BAIXO}>
        <span className={METADE}><IconeVisualizacao />{numeroCurto(vistas)}</span>
        <span className={`${METADE} border-l border-border`}>
          <IconeResposta />{numeroCurto(respostas)}
        </span>
      </div>
    </div>
  );
});
