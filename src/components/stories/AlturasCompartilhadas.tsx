import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

/** Slots que participam da grade compartilhada de alturas. */
export type SlotAltura = "observacao" | "cta_link" | "adjust_comment";

/** Cada registro guarda em que linha visual o campo está e qual a altura natural dele. */
type Registro = { linha: string; altura: number };

type Ctx = {
  /** Para cada slot, o maior valor encontrado em cada linha visual. */
  maximos: Record<SlotAltura, Record<string, number>>;
  registrar: (slot: SlotAltura, id: string, linha: string, altura: number) => void;
  remover: (slot: SlotAltura, id: string) => void;
};

const VAZIO: Record<SlotAltura, Record<string, number>> = {
  observacao: {},
  cta_link: {},
  adjust_comment: {},
};

/** Usado quando o campo está fora de qualquer bloco identificado. */
const LINHA_PADRAO = "sem-linha";

const AlturasContext = createContext<Ctx | null>(null);
const AcoesContext = createContext<Pick<Ctx, "registrar" | "remover"> | null>(null);
const LinhaContext = createContext<string>(LINHA_PADRAO);

/**
 * Marca todos os campos descendentes como pertencentes a uma mesma linha visual.
 * Blocos de linhas diferentes recebem valores diferentes e não se influenciam.
 */
export function LinhaAlturasProvider({
  linha,
  children,
}: {
  linha: string;
  children: ReactNode;
}) {
  return <LinhaContext.Provider value={linha}>{children}</LinhaContext.Provider>;
}

export function AlturasCompartilhadasProvider({ children }: { children: ReactNode }) {
  const mapa = useRef<Record<SlotAltura, Map<string, Registro>>>({
    observacao: new Map(),
    cta_link: new Map(),
    adjust_comment: new Map(),
  });
  const [maximos, setMaximos] = useState<Record<SlotAltura, Record<string, number>>>(VAZIO);

  const recalcular = useCallback((slot: SlotAltura) => {
    // Reconstrói o mapa de máximos do slot inteiro, para não sobrar linha antiga
    // quando um bloco muda de linha por causa de uma quebra diferente.
    const porLinha: Record<string, number> = {};
    for (const reg of mapa.current[slot].values()) {
      const atual = porLinha[reg.linha] ?? 0;
      if (reg.altura > atual) porLinha[reg.linha] = reg.altura;
    }

    setMaximos((estado) => {
      const antes = estado[slot];
      const chavesAntes = Object.keys(antes);
      const chavesDepois = Object.keys(porLinha);
      const igual =
        chavesAntes.length === chavesDepois.length &&
        chavesDepois.every((chave) => antes[chave] === porLinha[chave]);
      // Só mexe no estado quando algum máximo realmente mudou.
      return igual ? estado : { ...estado, [slot]: porLinha };
    });
  }, []);

  const registrar = useCallback(
    (slot: SlotAltura, id: string, linha: string, altura: number) => {
      const anterior = mapa.current[slot].get(id);
      if (anterior && anterior.linha === linha && anterior.altura === altura) return;
      mapa.current[slot].set(id, { linha, altura });
      recalcular(slot);
    },
    [recalcular],
  );

  const remover = useCallback(
    (slot: SlotAltura, id: string) => {
      if (!mapa.current[slot].has(id)) return;
      mapa.current[slot].delete(id);
      recalcular(slot);
    },
    [recalcular],
  );

  const value = useMemo(() => ({ maximos, registrar, remover }), [maximos, registrar, remover]);
  // Ações com identidade estável: evita que mudanças de altura recriem os efeitos
  // de registro/remoção (o que geraria um laço infinito de atualizações).
  const acoes = useMemo(() => ({ registrar, remover }), [registrar, remover]);

  return (
    <AcoesContext.Provider value={acoes}>
      <AlturasContext.Provider value={value}>{children}</AlturasContext.Provider>
    </AcoesContext.Provider>
  );
}

/**
 * Registra a altura natural medida da arte no slot e devolve a maior altura
 * daquele slot apenas entre as artes da mesma linha visual do grid.
 * Fora do provider devolve zero.
 */
export function useAlturaCompartilhada(
  slot: SlotAltura,
  id: string,
  alturaNatural: number,
): number {
  const ctx = useContext(AlturasContext);
  const acoes = useContext(AcoesContext);
  const linha = useContext(LinhaContext);

  useEffect(() => {
    acoes?.registrar(slot, id, linha, alturaNatural);
  }, [acoes, slot, id, linha, alturaNatural]);

  useEffect(() => {
    return () => acoes?.remover(slot, id);
  }, [acoes, slot, id]);

  return ctx?.maximos[slot][linha] ?? 0;
}
