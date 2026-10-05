import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Mantém o quadro inteiro atualizado quando qualquer pessoa mexe em um card. */
export function useQuadroAoVivo(quadroId: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!quadroId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const recarregar = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void qc.invalidateQueries({ queryKey: ["tarefas", "quadro", quadroId] });
        void qc.invalidateQueries({ queryKey: ["tarefas", "checklist"] });
        void qc.invalidateQueries({ queryKey: ["tarefas", "meus"] });
        void qc.invalidateQueries({ queryKey: ["tarefas", "mes"] });
      }, 300);
    };

    const canal = supabase
      .channel(`quadro-vivo-${quadroId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tarefa_cards", filter: `quadro_id=eq.${quadroId}` }, recarregar)
      .on("postgres_changes", { event: "*", schema: "public", table: "tarefa_card_etiquetas" }, recarregar)
      .on("postgres_changes", { event: "*", schema: "public", table: "tarefa_checklist" }, recarregar)
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(canal);
    };
  }, [quadroId, qc]);
}
