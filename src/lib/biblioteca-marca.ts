import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CorPaleta = {
  id: string;
  nome: string;
  hex: string;
  rascunho: boolean;
  posicao: number;
  ativo: boolean;
};

export const GRUPOS_TEXTO = ["frase", "infantil", "cta", "texto"] as const;
export type GrupoTexto = (typeof GRUPOS_TEXTO)[number];

export const ROTULO_GRUPO: Record<GrupoTexto, string> = {
  frase: "Frases",
  infantil: "Frases infantis",
  cta: "Chamadas para ação",
  texto: "Textos prontos",
};

export type TextoMarca = {
  id: string;
  grupo: GrupoTexto;
  titulo: string | null;
  texto: string;
  observacao: string | null;
  posicao: number;
  ativo: boolean;
};

export const paletaQueryOptions = queryOptions({
  queryKey: ["biblioteca", "paleta"] as const,
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
  queryFn: async (): Promise<CorPaleta[]> => {
    const { data, error } = await supabase
      .from("biblioteca_paleta")
      .select("id, nome, hex, rascunho, posicao, ativo")
      .order("posicao", { ascending: true });
    if (error) throw error;
    return (data ?? []) as CorPaleta[];
  },
});

export const textosQueryOptions = queryOptions({
  queryKey: ["biblioteca", "textos"] as const,
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
  queryFn: async (): Promise<TextoMarca[]> => {
    const { data, error } = await supabase
      .from("biblioteca_textos")
      .select("id, grupo, titulo, texto, observacao, posicao, ativo")
      .order("grupo", { ascending: true })
      .order("posicao", { ascending: true });
    if (error) throw error;
    return (data ?? []) as TextoMarca[];
  },
});

export async function salvarCorPaleta(
  id: string,
  patch: Partial<Pick<CorPaleta, "nome" | "hex" | "rascunho" | "posicao" | "ativo">>,
) {
  const { error } = await supabase.from("biblioteca_paleta").update(patch).eq("id", id);
  if (error) throw error;
}

export async function criarCorPaleta(nome: string, hex: string, posicao: number) {
  const { error } = await supabase
    .from("biblioteca_paleta")
    .insert({ nome, hex, posicao, rascunho: true });
  if (error) throw error;
}

export async function apagarCorPaleta(id: string) {
  const { error } = await supabase.from("biblioteca_paleta").delete().eq("id", id);
  if (error) throw error;
}

export async function salvarTexto(
  id: string,
  patch: Partial<Pick<TextoMarca, "titulo" | "texto" | "observacao" | "posicao" | "ativo">>,
) {
  const { error } = await supabase.from("biblioteca_textos").update(patch).eq("id", id);
  if (error) throw error;
}

export async function criarTexto(grupo: GrupoTexto, texto: string, posicao: number) {
  const { error } = await supabase
    .from("biblioteca_textos")
    .insert({ grupo, texto, posicao });
  if (error) throw error;
}

export async function apagarTexto(id: string) {
  const { error } = await supabase.from("biblioteca_textos").delete().eq("id", id);
  if (error) throw error;
}
