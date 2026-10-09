import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  COLUNA_MURAL_MAX,
  COLUNA_MURAL_MIN,
  medirMosaico,
  medirPeca,
  type GrupoReferencia,
  type Referencia,
} from "@/lib/biblioteca-referencias";
import {
  MolduraReferencia,
  estiloMosaico,
  estiloPeca,
  useLarguraDisponivel,
} from "@/components/biblioteca/MosaicoReferencias";

/**
 * Mural do grupo inteiro em tela cheia. O encaixe é automático,
 * os buracos são preenchidos por quem couber, para caber mais na mesma tela.
 * Clicar numa imagem abre ela sozinha ainda maior. Esc volta um nível de cada vez.
 */
export function MuralReferencias({
  grupo,
  refs,
  previas,
  onFechar,
}: {
  grupo: GrupoReferencia;
  refs: Referencia[];
  previas: Record<string, string>;
  onFechar: () => void;
}) {
  const { alvo, largura } = useLarguraDisponivel();
  const { colunas, larguraColuna } = useMemo(
    () => medirMosaico(largura, COLUNA_MURAL_MIN, COLUNA_MURAL_MAX),
    [largura],
  );
  const [aberta, setAberta] = useState<number | null>(null);

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setAberta((atual) => {
          if (atual !== null) return null;
          onFechar();
          return null;
        });
        return;
      }
      setAberta((atual) => {
        if (atual === null) return atual;
        if (e.key === "ArrowRight") return (atual + 1) % refs.length;
        if (e.key === "ArrowLeft") return (atual - 1 + refs.length) % refs.length;
        return atual;
      });
    }
    document.addEventListener("keydown", tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = antes;
    };
  }, [onFechar, refs.length]);

  const atual = aberta !== null ? refs[aberta] : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#161616]">
      <div className="flex shrink-0 items-center justify-between px-5 py-3">
        <span className="text-sm font-medium text-white">{grupo.nome}</span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-white/60">
            {refs.length} {refs.length === 1 ? "referência" : "referências"}
          </span>
          <button
            type="button"
            aria-label="Fechar o mural"
            onClick={onFechar}
            className="rounded-md p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      <div ref={alvo} className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
        <div style={estiloMosaico(colunas, true)}>
          {refs.map((r, i) => {
            const peca = medirPeca(r, larguraColuna, colunas);
            return (
              <button
                key={r.id}
                type="button"
                title={r.nome}
                onClick={() => setAberta(i)}
                style={estiloPeca(peca, colunas)}
                className="block w-full text-left transition-opacity hover:opacity-90"
              >
                <MolduraReferencia r={r} url={previas[r.caminho] ?? ""} peca={peca} escuro />
              </button>
            );
          })}
        </div>
      </div>

      {atual ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0b0b0b]/95">
          <button
            type="button"
            aria-label="Anterior"
            onClick={() => setAberta((a) => (a === null ? a : (a - 1 + refs.length) % refs.length))}
            className="absolute left-3 rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="size-7" />
          </button>
          <img
            src={previas[atual.caminho] ?? ""}
            alt={atual.nome}
            draggable={false}
            className="max-h-[88vh] max-w-[88vw] object-contain"
          />
          <button
            type="button"
            aria-label="Próxima"
            onClick={() => setAberta((a) => (a === null ? a : (a + 1) % refs.length))}
            className="absolute right-3 rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ChevronRight className="size-7" />
          </button>
          <button
            type="button"
            aria-label="Voltar para o mural"
            onClick={() => setAberta(null)}
            className="absolute right-4 top-4 rounded-md p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/50">
            {(aberta ?? 0) + 1} de {refs.length}
          </span>
        </div>
      ) : null}
    </div>
  );
}
