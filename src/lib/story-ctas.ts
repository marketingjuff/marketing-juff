import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Frentes de venda que agrupam as frases de CTA. */
export const CTA_GRUPOS = ["Juff Store", "Juff Custom"] as const;
export type CtaGrupo = (typeof CTA_GRUPOS)[number];

export type Cta = {
  id: string;
  texto: string;
  grupo: string;
  arquivado: boolean;
};

export type LinkCta = {
  id: string;
  nome: string;
  url: string;
  descricao: string;
  arquivado: boolean;
};

export const ctasQueryOptions = queryOptions({
  queryKey: ["story-ctas"],
  queryFn: fetchCtas,
});

export const linksQueryOptions = queryOptions({
  queryKey: ["story-links"],
  queryFn: fetchLinks,
});

export async function fetchCtas(): Promise<Cta[]> {
  const { data, error } = await supabase
    .from("story_ctas")
    .select("id, texto, grupo, arquivado")
    .order("grupo", { ascending: true })
    .order("texto", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: c.id,
    texto: c.texto ?? "",
    grupo: c.grupo ?? "Juff Store",
    arquivado: c.arquivado ?? false,
  }));
}

export async function fetchLinks(): Promise<LinkCta[]> {
  const { data, error } = await supabase
    .from("story_links")
    .select("id, nome, url, descricao, arquivado")
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((l) => ({
    id: l.id,
    nome: l.nome ?? "",
    url: l.url ?? "",
    descricao: l.descricao ?? "",
    arquivado: l.arquivado ?? false,
  }));
}

export async function createCta(texto: string, grupo: string): Promise<void> {
  const { error } = await supabase.from("story_ctas").insert({ texto: texto.trim(), grupo });
  if (error) throw error;
}

export async function updateCta(
  id: string,
  values: { texto?: string; grupo?: string; arquivado?: boolean },
): Promise<void> {
  const { error } = await supabase.from("story_ctas").update(values).eq("id", id);
  if (error) throw error;
}

/** Exclusão real. Só deve ser chamada após confirmação. */
export async function deleteCta(id: string): Promise<void> {
  const { error } = await supabase.from("story_ctas").delete().eq("id", id);
  if (error) throw error;
}

export async function createLink(nome: string, url: string, descricao: string): Promise<void> {
  const { error } = await supabase
    .from("story_links")
    .insert({ nome: nome.trim(), url: normalizaUrl(url), descricao: descricao.trim() });
  if (error) throw error;
}

export async function updateLink(
  id: string,
  values: { nome?: string; url?: string; descricao?: string; arquivado?: boolean },
): Promise<void> {
  const patch = { ...values };
  if (patch.url !== undefined) patch.url = normalizaUrl(patch.url);
  const { error } = await supabase.from("story_links").update(patch).eq("id", id);
  if (error) throw error;
}

/** Exclusão real. Só deve ser chamada após confirmação. */
export async function deleteLink(id: string): Promise<void> {
  const { error } = await supabase.from("story_links").delete().eq("id", id);
  if (error) throw error;
}

/** Garante que o endereço tenha protocolo e nada de espaço sobrando. */
export function normalizaUrl(value: string): string {
  const texto = (value ?? "").trim();
  if (!texto) return "";
  if (/^https?:\/\//i.test(texto)) return texto;
  return `https://${texto}`;
}

/** Chave de comparação para casar o que a IA escreveu com o que está cadastrado. */
export function chaveCta(value: string): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Chave de comparação de endereço, ignorando protocolo, www e barra final. */
export function chaveLink(value: string): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}
