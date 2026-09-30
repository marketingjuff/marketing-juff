import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { avancarRecorrentes } from "@/lib/tarefas";

const CHAVE = "juff.recorrentes.ultimo";

/**
 * Empurra os cards recorrentes vencidos para a próxima ocorrência.
 * Roda no máximo uma vez por dia, por navegador, em segundo plano.
 * Falha em silêncio, porque não é ação pedida pelo usuário.
 */
export function useAvancarRecorrentes(ativo: boolean): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!ativo) return;
    const hoje = new Date().toISOString().slice(0, 10);
    try {
      if (localStorage.getItem(CHAVE) === hoje) return;
      localStorage.setItem(CHAVE, hoje);
    } catch {
      // navegador sem storage, segue e roda nesta sessão
    }
    avancarRecorrentes()
      .then((n) => {
        if (n > 0) void qc.invalidateQueries({ queryKey: ["tarefas"] });
      })
      .catch(() => {
        // silêncio proposital
      });
  }, [ativo, qc]);
}
