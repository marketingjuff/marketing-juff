import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CATALOGO_CONSULTAS } from "@/lib/catalogo-sincronizacao";

/** Uma assinatura por tela, compartilhada por todos os seletores do catálogo. */
export function useCatalogoAoVivo() {
  const qc = useQueryClient();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const pendentes = new Map<string, readonly string[]>();
    const agendar = (chaves: readonly (readonly string[])[]) => {
      for (const chave of chaves) pendentes.set(chave.join("/"), chave);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        for (const queryKey of pendentes.values()) void qc.invalidateQueries({ queryKey });
        pendentes.clear();
      }, 150);
    };
    const atualizarTudo = () => agendar(Object.values(CATALOGO_CONSULTAS).flat());
    const aoVoltar = () => {
      if (document.visibilityState === "visible") atualizarTudo();
    };
    const canal = supabase.channel(`catalogo-${crypto.randomUUID()}`);
    for (const [table, chaves] of Object.entries(CATALOGO_CONSULTAS)) {
      canal.on("postgres_changes", { event: "*", schema: "public", table }, () => agendar(chaves));
    }
    canal.subscribe((status) => {
      // Atualiza também ao reconectar, recuperando alterações feitas enquanto estava desconectado.
      if (status === "SUBSCRIBED") atualizarTudo();
    });
    window.addEventListener("focus", atualizarTudo);
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("focus", atualizarTudo);
      document.removeEventListener("visibilitychange", aoVoltar);
      void supabase.removeChannel(canal);
    };
  }, [qc]);
}