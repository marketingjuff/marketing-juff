import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
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
    setMaximos((atual) => (atual[slot] === maior ? atual : { ...atual, [slot]: maior }));
  }, []);

  const registrar = useCallback(
    (slot: SlotAltura, id: string, altura: number) => {
      const anterior = mapa.current[slot].get(id);
      if (anterior === altura) return;
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

  return <AlturasContext.Provider value={value}>{children}</AlturasContext.Provider>;
}

/**
 * Registra a altura natural medida e devolve a maior altura daquele slot na página.
 * Fora do provider, devolve zero e não registra nada.
 */
export function useAlturaCompartilhada(slot: SlotAltura, id: string, alturaNatural: number): number {
  const ctx = useContext(AlturasContext);
  const registrarRef = useRef<Ctx | null>(ctx);
  registrarRef.current = ctx;

  if (ctx) ctx.registrar(slot, id, alturaNatural);

  // Remove o registro quando a arte sai da tela.
  const cleanupRef = useRef<() => void>(() => {});
  cleanupRef.current = () => registrarRef.current?.remover(slot, id);
  useLimparNaDesmontagem(cleanupRef);

  return ctx?.maximos[slot] ?? 0;
}

function useLimparNaDesmontagem(ref: { current: () => void }) {
  const efeito = useRef<(() => void) | null>(null);
  if (!efeito.current) efeito.current = () => ref.current();
  useOnUnmount(() => ref.current());
}

function useOnUnmount(fn: () => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffectOnce(() => () => ref.current());
}

function useEffectOnce(effect: () => () => void) {
  const ref = useRef<null | (() => void)>(null);
  if (ref.current === null) ref.current = effect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useCleanup(ref);
}

function useCleanup(ref: { current: null | (() => void) }) {
  const guard = useRef(false);
  if (!guard.current) guard.current = true;
  // Limpa de verdade na desmontagem.
  useUnmountEffect(() => ref.current?.());
}

function useUnmountEffect(fn: () => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useReactEffect(() => () => ref.current(), []);
}

import { useEffect as useReactEffect } from "react";
