import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const SOLTA_EM = 3000;

export type EmEdicao = Record<string, string>;

/**
 * Avisa quem está digitando em cada campo do card e devolve o que está travado.
 * A trava nasce na primeira tecla, se renova enquanto digita e solta sozinha
 * três segundos depois da última tecla. Nada disso toca no banco.
 */
export function useCampoEmEdicao(cardId: string | null, ativo: boolean, meuId: string, meuNome: string) {
  const [travados, setTravados] = useState<EmEdicao>({});
  const canal = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const campoAtual = useRef<string | null>(null);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!ativo || !cardId || !meuId) return;

    const ch = supabase.channel(`card-edicao-${cardId}`, { config: { presence: { key: meuId } } });

    const recalcular = () => {
      const estado = ch.presenceState() as Record<string, Array<{ campo?: string | null; nome?: string }>>;
      const mapa: EmEdicao = {};
      for (const [chave, lista] of Object.entries(estado)) {
        if (chave === meuId) continue;
        const p = lista[0];
        if (p?.campo) mapa[p.campo] = p.nome ?? "Alguém";
      }
      setTravados(mapa);
    };

    ch.on("presence", { event: "sync" }, recalcular)
      .on("presence", { event: "join" }, recalcular)
      .on("presence", { event: "leave" }, recalcular)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void ch.track({ campo: null, nome: meuNome });
      });

    canal.current = ch;

    return () => {
      if (relogio.current) clearTimeout(relogio.current);
      campoAtual.current = null;
      void supabase.removeChannel(ch);
      canal.current = null;
      setTravados({});
    };
  }, [cardId, ativo, meuId, meuNome]);

  /** Chamar a cada tecla digitada no campo. */
  const digitando = useCallback(
    (campo: string) => {
      const ch = canal.current;
      if (!ch) return;
      if (campoAtual.current !== campo) {
        campoAtual.current = campo;
        void ch.track({ campo, nome: meuNome });
      }
      if (relogio.current) clearTimeout(relogio.current);
      relogio.current = setTimeout(() => {
        campoAtual.current = null;
        void ch.track({ campo: null, nome: meuNome });
      }, SOLTA_EM);
    },
    [meuNome],
  );

  return { travados, digitando };
}
