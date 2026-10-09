import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const DEPOSITO = "referencias";

/** Print entra reduzido. O original não é guardado em lugar nenhum. */
export const LADO_MAXIMO = 2400;

/** Teto do arquivo que a pessoa escolhe, antes da redução. */
export const ENTRADA_MAXIMA = 40 * 1024 * 1024;

/** Largura base da coluna do mosaico, por tamanho escolhido na tela. */
export const LARGURA_COLUNA = { p: 150, m: 220, g: 320 } as const;
export type TamanhoGrade = keyof typeof LARGURA_COLUNA;

/** No mural a coluna fica entre estes dois valores, o número de colunas sai da tela. */
export const COLUNA_MURAL_MIN = 340;
export const COLUNA_MURAL_MAX = 420;

export const VAO = 8;

/** Mais deitado que isso ocupa duas colunas. */
export const PROPORCAO_DUPLA = 2;
/** Mais deitado que isso ocupa a linha inteira. */
export const PROPORCAO_CHEIA = 3.5;
/** Altura máxima, em vezes a largura da coluna. */
export const FATOR_TETO = 2.5;
/** Altura mínima em pixels, para a imagem não virar uma risca. */
export const PISO_ALTURA = 70;

export type GrupoReferencia = {
  id: string;
  nome: string;
  posicao: number;
  ativo: boolean;
};

export type Referencia = {
  id: string;
  grupo_id: string;
  nome: string;
  caminho: string;
  formato: string;
  largura: number;
  altura: number;
  tamanho_bytes: number;
  posicao: number;
  ativo: boolean;
};

export const gruposReferenciaQueryOptions = queryOptions({
  queryKey: ["biblioteca", "referencia-grupos"] as const,
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
  queryFn: async (): Promise<GrupoReferencia[]> => {
    const { data, error } = await supabase
      .from("biblioteca_referencia_grupos")
      .select("id, nome, posicao, ativo")
      .order("posicao", { ascending: true });
    if (error) throw error;
    return (data ?? []) as GrupoReferencia[];
  },
});

export const referenciasQueryOptions = queryOptions({
  queryKey: ["biblioteca", "referencias"] as const,
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
  queryFn: async (): Promise<Referencia[]> => {
    const { data, error } = await supabase
      .from("biblioteca_referencias")
      .select("id, grupo_id, nome, caminho, formato, largura, altura, tamanho_bytes, posicao, ativo")
      .order("posicao", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Referencia[];
  },
});

/** Endereços temporários para mostrar na tela. Uma chamada só para todos. */
export function previasReferenciaQueryOptions(caminhos: string[]) {
  const chave = [...caminhos].sort();
  return queryOptions({
    queryKey: ["biblioteca", "referencia-previas", chave] as const,
    enabled: chave.length > 0,
    staleTime: 50 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Record<string, string>> => {
      const mapa: Record<string, string> = {};
      // O depósito aceita um número limitado por chamada, então vai em blocos.
      for (let i = 0; i < chave.length; i += 100) {
        const bloco = chave.slice(i, i + 100);
        const { data, error } = await supabase.storage.from(DEPOSITO).createSignedUrls(bloco, 3600);
        if (error) throw error;
        for (const item of data ?? []) {
          if (item.path && item.signedUrl) mapa[item.path] = item.signedUrl;
        }
      }
      return mapa;
    },
  });
}

// ---------------- Medida do mosaico ----------------

export type Peca = {
  /** Quantas colunas a imagem ocupa. */
  span: number;
  /** Altura em pixels já com teto e piso aplicados. */
  altura: number;
  /** Passou do teto, então mostra só a parte de cima com esmaecido. */
  recortada: boolean;
  /** Ficou abaixo do piso, então aparece inteira com faixa neutra nas laterais. */
  comFaixa: boolean;
};

export function proporcaoDe(r: Pick<Referencia, "largura" | "altura">): number {
  return r.largura > 0 && r.altura > 0 ? r.largura / r.altura : 1;
}

export function medirPeca(
  r: Pick<Referencia, "largura" | "altura">,
  larguraColuna: number,
  colunas: number,
): Peca {
  const prop = proporcaoDe(r);
  const span =
    prop > PROPORCAO_CHEIA ? colunas : prop > PROPORCAO_DUPLA ? Math.min(2, colunas) : 1;
  const larguraReal = larguraColuna * span + VAO * (span - 1);
  const bruta = larguraReal / prop;
  const teto = larguraColuna * FATOR_TETO;
  const altura = Math.round(Math.min(Math.max(bruta, PISO_ALTURA), teto));
  return {
    span,
    altura,
    recortada: bruta > teto + 1,
    comFaixa: bruta < PISO_ALTURA - 1,
  };
}

/**
 * Quantas colunas cabem e com que largura cada uma fica.
 * A coluna estica para preencher a largura disponível, sem sobrar vão à direita.
 */
export function medirMosaico(
  largura: number,
  base: number,
  maximo?: number,
): { colunas: number; larguraColuna: number } {
  if (largura <= 0) return { colunas: 1, larguraColuna: base };
  let colunas = Math.max(1, Math.floor((largura + VAO) / (base + VAO)));
  let lc = Math.floor((largura - VAO * (colunas - 1)) / colunas);
  while (maximo && lc > maximo && colunas < 16) {
    colunas += 1;
    lc = Math.floor((largura - VAO * (colunas - 1)) / colunas);
  }
  return { colunas, larguraColuna: Math.max(60, lc) };
}

// ---------------- Preparo da imagem ----------------

/** Olha só uma miniatura, suficiente para saber se existe transparência. */
function temTransparencia(bitmap: ImageBitmap): boolean {
  const lado = 64;
  const tela = document.createElement("canvas");
  tela.width = lado;
  tela.height = lado;
  const ctx = tela.getContext("2d", { willReadFrequently: true });
  if (!ctx) return true;
  ctx.drawImage(bitmap, 0, 0, lado, lado);
  const dados = ctx.getImageData(0, 0, lado, lado).data;
  for (let i = 3; i < dados.length; i += 4) {
    if ((dados[i] ?? 255) < 250) return true;
  }
  return false;
}

export type ImagemPronta = { blob: Blob; formato: string; largura: number; altura: number };

/** Reduz para o lado máximo e devolve já no formato que vai ser guardado. */
export async function prepararImagem(arquivo: File): Promise<ImagemPronta> {
  if (!arquivo.type.startsWith("image/")) {
    throw new Error("Só entra imagem aqui.");
  }
  if (arquivo.size > ENTRADA_MAXIMA) {
    throw new Error("A imagem passa de 40 MB.");
  }
  const bitmap = await createImageBitmap(arquivo);
  try {
    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
    const largura = Math.max(1, Math.round(bitmap.width * escala));
    const altura = Math.max(1, Math.round(bitmap.height * escala));
    const tela = document.createElement("canvas");
    tela.width = largura;
    tela.height = altura;
    const ctx = tela.getContext("2d");
    if (!ctx) throw new Error("O navegador não conseguiu preparar a imagem.");
    ctx.drawImage(bitmap, 0, 0, largura, altura);
    const alfa = arquivo.type === "image/png" && temTransparencia(bitmap);
    const tipo = alfa ? "image/png" : "image/webp";
    const blob = await new Promise<Blob | null>((ok) => tela.toBlob(ok, tipo, 0.9));
    if (!blob) throw new Error("Não foi possível converter a imagem.");
    return { blob, formato: alfa ? "png" : "webp", largura, altura };
  } finally {
    bitmap.close?.();
  }
}

/** Print colado chega com nome genérico, então ganha um nome com data e hora. */
export function nomeSugerido(arquivo: File): string {
  const base = arquivo.name.replace(/\.[^.]+$/, "").trim();
  const generico = /^(image|imagem|screenshot|screen shot|captura|print|unknown)([ _-]?\d+)?$/i;
  if (base && !generico.test(base)) return base.slice(0, 80);
  const d = new Date();
  const dois = (n: number) => String(n).padStart(2, "0");
  return `Print ${dois(d.getDate())}-${dois(d.getMonth() + 1)} ${dois(d.getHours())}h${dois(d.getMinutes())}`;
}

// ---------------- Grupos ----------------

export async function criarGrupoReferencia(nome: string, posicao: number): Promise<string> {
  const { data, error } = await supabase
    .from("biblioteca_referencia_grupos")
    .insert({ nome, posicao })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function salvarGrupoReferencia(
  id: string,
  patch: Partial<Pick<GrupoReferencia, "nome" | "posicao" | "ativo">>,
) {
  const { error } = await supabase.from("biblioteca_referencia_grupos").update(patch).eq("id", id);
  if (error) throw error;
}

/**
 * Apaga o grupo e, antes, os arquivos de dentro dele no depósito.
 * A linha some pelo vínculo em cascata, o arquivo físico não,
 * e ele precisa sair junto para não virar lixo ocupando espaço.
 */
export async function apagarGrupoReferencia(id: string, caminhos: string[]) {
  if (caminhos.length) await supabase.storage.from(DEPOSITO).remove(caminhos);
  const { error } = await supabase.from("biblioteca_referencia_grupos").delete().eq("id", id);
  if (error) throw error;
}

// ---------------- Imagens ----------------

export async function enviarReferencia(grupoId: string, arquivo: File, posicao: number) {
  const pronta = await prepararImagem(arquivo);
  const caminho = `${grupoId}/${crypto.randomUUID()}.${pronta.formato}`;

  const { error: erroEnvio } = await supabase.storage
    .from(DEPOSITO)
    .upload(caminho, pronta.blob, { cacheControl: "3600", upsert: false, contentType: pronta.blob.type });
  if (erroEnvio) throw erroEnvio;

  const { error } = await supabase.from("biblioteca_referencias").insert({
    grupo_id: grupoId,
    nome: nomeSugerido(arquivo),
    caminho,
    formato: pronta.formato,
    largura: pronta.largura,
    altura: pronta.altura,
    tamanho_bytes: pronta.blob.size,
    posicao,
  });
  if (error) {
    // Falhou a linha, então o arquivo solto sai para não virar lixo.
    await supabase.storage.from(DEPOSITO).remove([caminho]);
    throw error;
  }
}

export async function salvarReferencia(
  id: string,
  patch: Partial<Pick<Referencia, "nome" | "posicao" | "grupo_id" | "ativo">>,
) {
  const { error } = await supabase.from("biblioteca_referencias").update(patch).eq("id", id);
  if (error) throw error;
}

export async function apagarReferencia(id: string, caminho: string) {
  await supabase.storage.from(DEPOSITO).remove([caminho]);
  const { error } = await supabase.from("biblioteca_referencias").delete().eq("id", id);
  if (error) throw error;
}

/** Lote em uma chamada só, nunca um update por linha. */
export async function reordenarReferencias(
  itens: { id: string; grupo_id: string; posicao: number }[],
) {
  if (!itens.length) return;
  const { error } = await supabase.rpc("biblioteca_referencias_reordenar", { p_itens: itens });
  if (error) throw error;
}

export async function baixarConteudoReferencia(caminho: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(DEPOSITO).download(caminho);
  if (error) throw error;
  return data;
}

// ---------------- Preparo do PDF ----------------

export type ItemMoodboard = { dataUrl: string; proporcao: number; span: number };

/** Proporção mais comprida que o PDF aceita antes de recortar o pé da imagem. */
const PROPORCAO_MINIMA_PDF = 1 / FATOR_TETO;

function blobParaBitmap(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob);
}

/**
 * Baixa cada imagem, recorta quem passa do teto e devolve pronta para o papel.
 * Vira JPEG com fundo branco, que é o que imprime certo.
 */
export async function prepararMoodboard(refs: Referencia[]): Promise<ItemMoodboard[]> {
  const itens: ItemMoodboard[] = [];
  for (const r of refs) {
    try {
      const blob = await baixarConteudoReferencia(r.caminho);
      const bitmap = await blobParaBitmap(blob);
      try {
        const propOriginal = bitmap.width / bitmap.height;
        const span = propOriginal > PROPORCAO_DUPLA ? 2 : 1;
        const recorta = span === 1 && propOriginal < PROPORCAO_MINIMA_PDF;
        const largura = bitmap.width;
        const altura = recorta ? Math.round(largura / PROPORCAO_MINIMA_PDF) : bitmap.height;
        const tela = document.createElement("canvas");
        tela.width = largura;
        tela.height = altura;
        const ctx = tela.getContext("2d");
        if (!ctx) continue;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, largura, altura);
        ctx.drawImage(bitmap, 0, 0);
        itens.push({
          dataUrl: tela.toDataURL("image/jpeg", 0.9),
          proporcao: largura / altura,
          span,
        });
      } finally {
        bitmap.close?.();
      }
    } catch {
      // Imagem que não abre não derruba o moodboard inteiro, ela só fica de fora.
    }
  }
  return itens;
}
