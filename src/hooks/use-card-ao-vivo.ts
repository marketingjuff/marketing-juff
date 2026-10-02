import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Mantém o card aberto atualizado enquanto outra pessoa mexe nele. */
export function useCardAoVivo(cardId: string | null, quadroId: string | null, ativo: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!ativo || !cardId) return;

    const recarregar = () => {
      if (quadroId) void qc.invalidateQueries({ queryKey: ["tarefas", "quadro", quadroId] });
      void qc.invalidateQueries({ queryKey: ["tarefas", "comentarios", cardId] });
      void qc.invalidateQueries({ queryKey: ["tarefas", "historico", cardId] });
    };

    const canal = supabase
      .channel(`card-vivo-${cardId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tarefa_cards", filter: `id=eq.${cardId}` }, recarregar)
      .on("postgres_changes", { event: "*", schema: "public", table: "tarefa_comentarios", filter: `card_id=eq.${cardId}` }, recarregar)
      .on("postgres_changes", { event: "*", schema: "public", table: "tarefa_historico", filter: `card_id=eq.${cardId}` }, recarregar)
      .on("postgres_changes", { event: "*", schema: "public", table: "tarefa_card_etiquetas", filter: `card_id=eq.${cardId}` }, recarregar)
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [cardId, quadroId, ativo, qc]);
}
