import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const FAMILIAS = ["cromatica", "neutro", "cinza", "silk"] as const;
export type Familia = (typeof FAMILIAS)[number];

export const ROTULO_FAMILIA: Record<Familia, string> = {
  cromatica: "Cromáticas",
  neutro: "Neutros",
  cinza: "Escala de cinza",
  silk: "Silk",
};

/** Quantas cabem numa linha, do jeito que estão no deck impresso. */
export const POR_LINHA: Record<Familia, number> = {
  cromatica: 24,
  neutro: 8,
  cinza: 8,
  silk: 6,
};

export type CorEstampa = {
  id: string;
  codigo: string;
  nome: string;
  familia: Familia;
  c: number;
  m: number;
  y: number;
  k: number;
  hex: string;
  posicao: number;
  ativo: boolean;
};

export const estampaQueryOptions = queryOptions({
  queryKey: ["biblioteca", "estampa"] as const,
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
  queryFn: async (): Promise<CorEstampa[]> => {
    const { data, error } = await supabase
      .from("biblioteca_estampa_cores")
      .select("id, codigo, nome, familia, c, m, y, k, hex, posicao, ativo")
      .order("posicao", { ascending: true });
    if (error) throw error;
    return (data ?? []) as CorEstampa[];
  },
});

/** O que vai para a arte. Quatro números separados por espaço. */
export function textoCmyk(cor: Pick<CorEstampa, "c" | "m" | "y" | "k">): string {
  return `${cor.c} ${cor.m} ${cor.y} ${cor.k}`;
}

/**
 * Quebra a família em linhas do tamanho do impresso.
 * A última linha pode vir incompleta, e tudo bem.
 */
export function emLinhas(cores: CorEstampa[], porLinha: number): CorEstampa[][] {
  const out: CorEstampa[][] = [];
  for (let i = 0; i < cores.length; i += porLinha) out.push(cores.slice(i, i + porLinha));
  return out;
}

export async function salvarCorEstampa(
  id: string,
  patch: Partial<Pick<CorEstampa, "codigo" | "nome" | "c" | "m" | "y" | "k" | "hex" | "posicao" | "ativo">>,
) {
  const { error } = await supabase.from("biblioteca_estampa_cores").update(patch).eq("id", id);
  if (error) throw error;
}

export async function criarCorEstampa(familia: Familia, codigo: string, posicao: number) {
  const { error } = await supabase
    .from("biblioteca_estampa_cores")
    .insert({ familia, codigo, hex: "#888888", posicao });
  if (error) throw error;
}

export async function apagarCorEstampa(id: string) {
  const { error } = await supabase.from("biblioteca_estampa_cores").delete().eq("id", id);
  if (error) throw error;
}
