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
export type SlotAltura = "texto_principal" | "observacao" | "recurso_detalhe" | "adjust_comment";

type Ctx = {
  maximos: Record<SlotAltura, number>;
  registrar: (slot: SlotAltura, id: string, altura: number) => void;
  remover: (slot: SlotAltura, id: string) => void;
};

const ZERO: Record<SlotAltura, number> = {
  texto_principal: 0,
  observacao: 0,
  recurso_detalhe: 0,
  adjust_comment: 0,
};

const AlturasContext = createContext<Ctx | null>(null);
const AcoesContext = createContext<Pick<Ctx, "registrar" | "remover"> | null>(null);

export function AlturasCompartilhadasProvider({ children }: { children: ReactNode }) {
  const mapa = useRef<Record<SlotAltura, Map<string, number>>>({
    texto_principal: new Map(),
    observacao: new Map(),
    recurso_detalhe: new Map(),
    adjust_comment: new Map(),
  });
  const [maximos, setMaximos] = useState<Record<SlotAltura, number>>(ZERO);

  const recalcular = useCallback((slot: SlotAltura) => {
    let maior = 0;
    for (const valor of mapa.current[slot].values()) {
      if (valor > maior) maior = valor;
    }
    // Só mexe no estado quando o máximo do slot realmente muda.
    setMaximos((atual) => (atual[slot] === maior ? atual : { ...atual, [slot]: maior }));
  }, []);

  const registrar = useCallback(
    (slot: SlotAltura, id: string, altura: number) => {
      if (mapa.current[slot].get(id) === altura) return;
      mapa.current[slot].set(id, altura);
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
 * daquele slot em toda a página. Fora do provider devolve zero.
 */
export function useAlturaCompartilhada(
  slot: SlotAltura,
  id: string,
  alturaNatural: number,
): number {
  const ctx = useContext(AlturasContext);
  const acoes = useContext(AcoesContext);

  useEffect(() => {
    acoes?.registrar(slot, id, alturaNatural);
  }, [acoes, slot, id, alturaNatural]);

  useEffect(() => {
    return () => acoes?.remover(slot, id);
  }, [acoes, slot, id]);

  return ctx?.maximos[slot] ?? 0;
}
