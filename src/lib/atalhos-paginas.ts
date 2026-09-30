import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const MIME_ATALHO = "application/x-juff-atalho";

export type AtalhoPagina = { id: string; destino: string; label: string; posicao: number };

export const atalhosPaginasQueryOptions = queryOptions({
  queryKey: ["atalhos-paginas"],
  queryFn: async (): Promise<AtalhoPagina[]> => {
    const { data, error } = await supabase
      .from("atalhos_paginas")
      .select("id, destino, label, posicao")
      .order("posicao", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
  staleTime: 60_000,
  refetchOnWindowFocus: false,
});

export async function criarAtalhoPagina(destino: string, label: string, posicao: number) {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("atalhos_paginas")
    .upsert({ user_id: auth.user?.id ?? "", destino, label, posicao }, { onConflict: "user_id,destino" });
  if (error) throw error;
}

export async function excluirAtalhoPagina(id: string) {
  const { error } = await supabase.from("atalhos_paginas").delete().eq("id", id);
  if (error) throw error;
}

/** Props para tornar qualquer link arrastável até a barra de atalhos. */
export function arrastavel(destino: string, label: string) {
  return {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData(MIME_ATALHO, JSON.stringify({ destino, label }));
      e.dataTransfer.effectAllowed = "copy";
    },
  };
}
