import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const BUCKET_SOCIAL = "social";

export type FormatoSocial = { id: string; nome: string; posicao: number; ativo: boolean };

export type PostPlanejado = {
  id: string;
  data: string;
  titulo: string;
  formato_id: string | null;
  descricao: string;
  ads: boolean;
  posicao: number;
};

export type ItemPublicado = {
  id: string;
  ig_id: string;
  tipo: "post" | "story";
  formato: string;
  publicado_em: string;
  data: string;
  legenda: string;
  permalink: string;
  capa_path: string;
  curtidas: number;
  comentarios: number;
  visualizacoes: number;
  respostas: number;
  ads: boolean;
};

export type EstadoInstagram = {
  ig_user_id: string;
  nome_conta: string;
  ultima_leitura: string | null;
  ultimo_erro: string;
};

/** Primeiro e último dia do mês, em texto de data, sem fuso. */
export function limitesDoMes(ano: number, mes: number) {
  const ini = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const ultimo = new Date(ano, mes, 0).getDate();
  const fim = `${ano}-${String(mes).padStart(2, "0")}-${String(ultimo).padStart(2, "0")}`;
  return { ini, fim };
}

/** Número compacto, 1204 vira 1,2k. A faixa do card não quebra linha. */
export function numeroCurto(n: number) {
  return n > 999 ? `${(n / 1000).toFixed(1).replace(".", ",")}k` : String(n);
}

export const formatosQueryOptions = queryOptions({
  queryKey: ["social", "formatos"] as const,
  staleTime: 5 * 60_000,
  refetchOnWindowFocus: false,
  queryFn: async (): Promise<FormatoSocial[]> => {
    const { data, error } = await supabase
      .from("social_formatos")
      .select("id, nome, posicao, ativo")
      .order("posicao");
    if (error) throw error;
    return (data ?? []) as FormatoSocial[];
  },
});

export function planejadosQueryOptions(ano: number, mes: number) {
  const { ini, fim } = limitesDoMes(ano, mes);
  return queryOptions({
    queryKey: ["social", "planejados", ano, mes] as const,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<PostPlanejado[]> => {
      const { data, error } = await supabase
        .from("social_planejados")
        .select("id, data, titulo, formato_id, descricao, ads, posicao")
        .gte("data", ini)
        .lte("data", fim)
        .order("data")
        .order("posicao");
      if (error) throw error;
      return (data ?? []) as PostPlanejado[];
    },
  });
}

export function publicadosQueryOptions(ano: number, mes: number) {
  const { ini, fim } = limitesDoMes(ano, mes);
  return queryOptions({
    queryKey: ["social", "publicados", ano, mes] as const,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<ItemPublicado[]> => {
      const { data, error } = await supabase
        .from("social_publicados")
        .select(
          "id, ig_id, tipo, formato, publicado_em, data, legenda, permalink, capa_path, curtidas, comentarios, visualizacoes, respostas, ads",
        )
        .gte("data", ini)
        .lte("data", fim)
        .order("publicado_em");
      if (error) throw error;
      return (data ?? []) as ItemPublicado[];
    },
  });
}

/** Uma chamada só para todas as capas do mês, nunca uma por card. */
export function capasQueryOptions(ano: number, mes: number, paths: string[]) {
  return queryOptions({
    queryKey: ["social", "capas", ano, mes, paths.length] as const,
    enabled: paths.length > 0,
    staleTime: 50 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data } = await supabase.storage.from(BUCKET_SOCIAL).createSignedUrls(paths, 3600);
      const mapa: Record<string, string> = {};
      for (const item of data ?? []) {
        if (item.path && item.signedUrl) mapa[item.path] = item.signedUrl;
      }
      return mapa;
    },
  });
}

export const estadoInstagramQueryOptions = queryOptions({
  queryKey: ["social", "instagram", "estado"] as const,
  staleTime: 60_000,
  refetchOnWindowFocus: false,
  queryFn: async (): Promise<EstadoInstagram | null> => {
    const { data } = await supabase
      .from("social_instagram_estado")
      .select("ig_user_id, nome_conta, ultima_leitura, ultimo_erro")
      .maybeSingle();
    return (data ?? null) as EstadoInstagram | null;
  },
});

export async function criarPlanejado(p: {
  data: string; titulo: string; formato_id: string | null; descricao: string; ads: boolean;
}) {
  const { data, error } = await supabase
    .from("social_planejados")
    .insert({ ...p, criado_por: (await supabase.auth.getUser()).data.user?.id ?? null })
    .select("id, data, titulo, formato_id, descricao, ads, posicao")
    .single();
  if (error) throw error;
  return data as PostPlanejado;
}

export async function atualizarPlanejado(id: string, campos: Partial<PostPlanejado>) {
  const { error } = await supabase.from("social_planejados").update(campos).eq("id", id);
  if (error) throw error;
}

export async function excluirPlanejado(id: string) {
  const { error } = await supabase.from("social_planejados").delete().eq("id", id);
  if (error) throw error;
}

/** Única coisa que a tela grava no publicado. O resto vem do Instagram. */
export async function marcarAds(id: string, ads: boolean) {
  const { error } = await supabase.from("social_publicados").update({ ads }).eq("id", id);
  if (error) throw error;
}
