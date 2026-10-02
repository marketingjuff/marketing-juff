import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const MIME_ATALHO = "application/x-juff-atalho";

export const CHAVE_BARRA = ["atalhos-barra"] as const;

export type AtalhoBarra = {
  id: string;
  posicao: number;
  label: string;
  /** Caminho da página. Vazio quando o atalho é de quadro. */
  destino: string | null;
  /** Quadro apontado. Vazio quando o atalho é de página. */
  quadro_id: string | null;
  /** Primeira cor do fundo do quadro, só para atalho de quadro. */
  quadro_cor: string | null;
  /** Verdadeiro quando o quadro foi arquivado. */
  quadro_arquivado: boolean;
};

export type ConteudoArrasto =
  | { tipo: "pagina"; destino: string; label: string }
  | { tipo: "quadro"; quadro_id: string; label: string; cor?: string | null }
  | { tipo: "mover"; id: string };

export const atalhosBarraQueryOptions = queryOptions({
  queryKey: CHAVE_BARRA,
  queryFn: async (): Promise<AtalhoBarra[]> => {
    const { data, error } = await supabase
      .from("atalhos_paginas")
      .select("id, destino, label, posicao, quadro_id, tarefa_quadros(nome, fundo_tipo, fundo_cor1, arquivado)")
      .order("posicao", { ascending: true });
    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data ?? []) as any[])
      .filter((r) => !r.quadro_id || (r.tarefa_quadros && !r.tarefa_quadros.arquivado))
      .map((r) => ({
        id: r.id,
        posicao: r.posicao,
        label: r.label,
        destino: r.destino,
        quadro_id: r.quadro_id,
        quadro_cor: r.tarefa_quadros?.fundo_cor1 ?? null,
        quadro_arquivado: false,
      }));
  },
  staleTime: 60_000,
  refetchOnWindowFocus: false,
});

async function meuId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? "";
}

export async function criarAtalhoPagina(destino: string, label: string, posicao: number) {
  const { error } = await supabase
    .from("atalhos_paginas")
    .upsert({ user_id: await meuId(), destino, label, posicao }, { onConflict: "user_id,destino" });
  if (error) throw error;
}

export async function criarAtalhoQuadro(quadroId: string, label: string, posicao: number) {
  const { error } = await supabase
    .from("atalhos_paginas")
    .insert({ user_id: await meuId(), quadro_id: quadroId, destino: null, label, posicao });
  if (error && error.code !== "23505") throw error;
}

export async function excluirAtalhoPagina(id: string) {
  const { error } = await supabase.from("atalhos_paginas").delete().eq("id", id);
  if (error) throw error;
}

export function limparRotulo(label: string): string {
  return label.trim().slice(0, 40);
}

export async function renomearAtalho(id: string, label: string) {
  const limpo = limparRotulo(label);
  if (!limpo) return;
  const { error } = await supabase.from("atalhos_paginas").update({ label: limpo }).eq("id", id);
  if (error) throw error;
}

export async function reordenarAtalhos(ids: string[]) {
  const { error } = await supabase.rpc("reordenar_atalhos", { p_ids: ids });
  if (error) throw error;
}

function montar(conteudo: ConteudoArrasto) {
  return {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData(MIME_ATALHO, JSON.stringify(conteudo));
      e.dataTransfer.effectAllowed = "copy";
    },
  };
}

/** Props para tornar qualquer link arrastável até a barra de atalhos. */
export function arrastavel(destino: string, label: string) {
  return montar({ tipo: "pagina", destino, label });
}

/** Props para tornar um quadro arrastável até a barra de atalhos. */
export function arrastavelQuadro(quadroId: string, label: string, cor?: string | null) {
  return montar({ tipo: "quadro", quadro_id: quadroId, label, cor });
}
