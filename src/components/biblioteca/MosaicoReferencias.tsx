import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { VAO, type Peca, type Referencia } from "@/lib/biblioteca-referencias";

/** Mede o espaço disponível e acompanha a janela mudando de tamanho. */
export function useLarguraDisponivel() {
  const alvo = useRef<HTMLDivElement | null>(null);
  const [largura, setLargura] = useState(0);

  useEffect(() => {
    const el = alvo.current;
    if (!el) return;
    setLargura(el.getBoundingClientRect().width);
    const obs = new ResizeObserver((entradas) => {
      const w = entradas[0]?.contentRect.width ?? 0;
      setLargura((atual) => (Math.abs(atual - w) > 1 ? w : atual));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { alvo, largura };
}

/** Linhas de um pixel, então a altura da peça é exata e não sobra folga. */
export function estiloMosaico(colunas: number, denso: boolean): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))`,
    columnGap: VAO,
    rowGap: 0,
    gridAutoRows: "1px",
    gridAutoFlow: denso ? "row dense" : "row",
  };
}

export function estiloPeca(peca: Peca, colunas: number): React.CSSProperties {
  return {
    gridColumn: `span ${Math.min(peca.span, colunas)}`,
    gridRow: `span ${peca.altura + VAO}`,
  };
}

const XADREZ: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  backgroundImage:
    "linear-gradient(45deg,#e4e4e7 25%,transparent 25%),linear-gradient(-45deg,#e4e4e7 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e4e4e7 75%),linear-gradient(-45deg,transparent 75%,#e4e4e7 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
};

/**
 * A imagem em si. Nunca corta de propósito, só quando a altura estourou o teto,
 * e aí mostra a parte de cima com um esmaecido avisando que continua.
 */
export function MolduraReferencia({
  r,
  url,
  peca,
  escuro,
  className,
}: {
  r: Referencia;
  url: string;
  peca: Peca;
  escuro?: boolean;
  className?: string;
}) {
  return (
    <div
      style={{ height: peca.altura, ...(peca.comFaixa && !escuro ? XADREZ : undefined) }}
      className={cn(
        "relative w-full overflow-hidden rounded-lg",
        escuro ? "bg-[#2c2c2a]" : "border border-border bg-background",
        className,
      )}
    >
      {url ? (
        <img
          src={url}
          alt={r.nome}
          loading="lazy"
          decoding="async"
          draggable={false}
          className={cn(
            "h-full w-full",
            peca.comFaixa ? "object-contain" : "object-cover",
            peca.recortada && "object-top",
          )}
        />
      ) : (
        <div className="h-full w-full animate-pulse bg-muted" />
      )}
      {peca.recortada ? (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-lg",
            escuro
              ? "bg-gradient-to-t from-[#1c1c1c] to-transparent"
              : "bg-gradient-to-t from-background to-transparent",
          )}
        />
      ) : null}
    </div>
  );
}
