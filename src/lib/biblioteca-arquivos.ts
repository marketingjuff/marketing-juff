import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const DEPOSITO = "marca";

/** Formatos aceitos. PNG e SVG mostram prévia, o resto mostra cartão. */
export const FORMATOS = ["png", "svg", "jpg", "pdf", "ai", "eps", "zip"] as const;
export type Formato = (typeof FORMATOS)[number];

export const COM_PREVIA: readonly string[] = ["png", "svg", "jpg"];

export type GrupoArquivo = {
  id: string;
  nome: string;
  descricao: string | null;
  posicao: number;
  ativo: boolean;
};

export type ArquivoMarca = {
  id: string;
  grupo_id: string;
  nome: string;
  formato: string;
  variacao: string;
  caminho: string;
  tamanho_bytes: number;
  posicao: number;
  ativo: boolean;
};

export const gruposArquivoQueryOptions = queryOptions({
  queryKey: ["biblioteca", "arquivo-grupos"] as const,
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
  queryFn: async (): Promise<GrupoArquivo[]> => {
    const { data, error } = await supabase
      .from("biblioteca_arquivo_grupos")
      .select("id, nome, descricao, posicao, ativo")
      .order("posicao", { ascending: true });
    if (error) throw error;
    return (data ?? []) as GrupoArquivo[];
  },
});

export const arquivosQueryOptions = queryOptions({
  queryKey: ["biblioteca", "arquivos"] as const,
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
  queryFn: async (): Promise<ArquivoMarca[]> => {
    const { data, error } = await supabase
      .from("biblioteca_arquivos")
      .select("id, grupo_id, nome, formato, variacao, caminho, tamanho_bytes, posicao, ativo")
      .order("posicao", { ascending: true });
    if (error) throw error;
    return (data ?? []) as ArquivoMarca[];
  },
});

/** Endereços temporários para mostrar a prévia na tela. Uma chamada só para todos. */
export function previasQueryOptions(caminhos: string[]) {
  const chave = [...caminhos].sort();
  return queryOptions({
    queryKey: ["biblioteca", "arquivo-previas", chave] as const,
    enabled: chave.length > 0,
    staleTime: 50 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase.storage.from(DEPOSITO).createSignedUrls(chave, 3600);
      if (error) throw error;
      const mapa: Record<string, string> = {};
      for (const item of data ?? []) {
        if (item.path && item.signedUrl) mapa[item.path] = item.signedUrl;
      }
      return mapa;
    },
  });
}

export function extensaoDe(nomeArquivo: string): string {
  const p = nomeArquivo.lastIndexOf(".");
  return p < 0 ? "" : nomeArquivo.slice(p + 1).toLowerCase();
}

export function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

// ---------------- Grupos ----------------

export async function criarGrupo(nome: string, posicao: number) {
  const { data, error } = await supabase
    .from("biblioteca_arquivo_grupos")
    .insert({ nome, posicao })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function salvarGrupo(
  id: string,
  patch: Partial<Pick<GrupoArquivo, "nome" | "descricao" | "posicao" | "ativo">>,
) {
  const { error } = await supabase.from("biblioteca_arquivo_grupos").update(patch).eq("id", id);
  if (error) throw error;
}

/**
 * Apaga o grupo e, antes disso, os arquivos de dentro dele no depósito.
 * A linha some sozinha pelo vínculo em cascata, mas o arquivo físico não,
 * e ele precisa sair junto para não virar lixo ocupando espaço.
 */
export async function apagarGrupo(id: string, caminhos: string[]) {
  if (caminhos.length) await supabase.storage.from(DEPOSITO).remove(caminhos);
  const { error } = await supabase.from("biblioteca_arquivo_grupos").delete().eq("id", id);
  if (error) throw error;
}

// ---------------- Arquivos ----------------

export async function enviarArquivo(grupoId: string, arquivo: File, posicao: number) {
  const ext = extensaoDe(arquivo.name);
  const caminho = `${grupoId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

  const { error: erroEnvio } = await supabase.storage
    .from(DEPOSITO)
    .upload(caminho, arquivo, { cacheControl: "3600", upsert: false });
  if (erroEnvio) throw erroEnvio;

  const { error } = await supabase.from("biblioteca_arquivos").insert({
    grupo_id: grupoId,
    nome: arquivo.name.replace(/\.[^.]+$/, ""),
    formato: ext,
    caminho,
    tamanho_bytes: arquivo.size,
    posicao,
  });
  if (error) {
    // Falhou a linha, então o arquivo solto sai para não virar lixo.
    await supabase.storage.from(DEPOSITO).remove([caminho]);
    throw error;
  }
}

export async function salvarArquivo(
  id: string,
  patch: Partial<Pick<ArquivoMarca, "nome" | "variacao" | "posicao" | "ativo">>,
) {
  const { error } = await supabase.from("biblioteca_arquivos").update(patch).eq("id", id);
  if (error) throw error;
}

export async function apagarArquivo(id: string, caminho: string) {
  await supabase.storage.from(DEPOSITO).remove([caminho]);
  const { error } = await supabase.from("biblioteca_arquivos").delete().eq("id", id);
  if (error) throw error;
}

/** Baixa o conteúdo, usado no download avulso e na exportação em ZIP. */
export async function baixarConteudo(caminho: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(DEPOSITO).download(caminho);
  if (error) throw error;
  return data;
}

export function nomeCompleto(a: ArquivoMarca): string {
  return a.formato ? `${a.nome}.${a.formato}` : a.nome;
}

export async function baixarNoNavegador(a: ArquivoMarca) {
  const blob = await baixarConteudo(a.caminho);
  const url = URL.createObjectURL(blob);
  const el = document.createElement("a");
  el.href = url;
  el.download = nomeCompleto(a);
  document.body.appendChild(el);
  el.click();
  document.body.removeChild(el);
  URL.revokeObjectURL(url);
}
