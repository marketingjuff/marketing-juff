import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Ordem oficial dos tamanhos. Nunca ordene tamanho por texto. */
export const ORDEM_TAMANHOS = ["PP", "P", "M", "G", "GG", "EXG", "EXXG"] as const;
export type Tamanho = (typeof ORDEM_TAMANHOS)[number];

/** Pontos de medição que existem hoje na Juff. */
export const PONTOS = ["altura", "largura", "tórax", "manga"] as const;
export type Ponto = (typeof PONTOS)[number];

export const CATEGORIAS = ["Normal", "Outlet"] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export type CorBiblioteca = {
  id: string;
  nome: string;
  nome_olist: string;
  hex: string;
  posicao: number;
  ativo: boolean;
};

export type ProdutoCor = { cor_id: string; categoria: Categoria };

export type ProdutoBiblioteca = {
  id: string;
  nome_base: string;
  tecido: string;
  usa_tecido: boolean;
  sufixo: string;
  usa_sufixo: boolean;
  usa_xtra: boolean;
  tamanhos_xtra: string[];
  tamanhos: string[];
  pontos: string[];
  posicao: number;
  ativo: boolean;
  cores: ProdutoCor[];
};

export type Medida = {
  produto_id: string;
  ponto: string;
  tamanho: string;
  minimo: number | null;
  alvo: number | null;
  maximo: number | null;
};

export type Variacao = {
  nome: string;
  cor: string;
  cor_olist: string;
  tamanho: string;
  categoria: Categoria;
  hex: string;
};

// ---------------- Montagem do nome oficial ----------------

/**
 * Prefixo da variação. O XTRA entra colado no tecido, antes de qualquer
 * hífen. O sufixo entra como pedaço próprio entre hífens, depois do tecido.
 * Produto com sufixo nunca recebe XTRA.
 */
export function prefixoVariacao(p: ProdutoBiblioteca, tamanho?: string): string {
  let s = p.nome_base;
  if (p.usa_tecido && p.tecido) s += ` ${p.tecido}`;
  const levaXtra =
    p.usa_xtra && !p.usa_sufixo && !!tamanho && p.tamanhos_xtra.includes(tamanho);
  if (levaXtra) s += " XTRA";
  if (p.usa_sufixo && p.sufixo) s += ` - ${p.sufixo}`;
  return s;
}

/** Nome do produto pai. Nunca leva XTRA, cor nem tamanho. */
export function nomePai(p: ProdutoBiblioteca): string {
  let s = p.nome_base;
  if (p.usa_tecido && p.tecido) s += ` ${p.tecido}`;
  if (p.usa_sufixo && p.sufixo) s += ` - ${p.sufixo}`;
  return `Juff Store - ${s}`;
}

/** Nome exibido na lista de produtos, sem a marca da loja. */
export function nomeCurto(p: ProdutoBiblioteca): string {
  return p.usa_sufixo && p.sufixo ? `${p.nome_base} ${p.sufixo}` : p.nome_base;
}

export function nomeOficial(
  p: ProdutoBiblioteca,
  corOlist: string,
  tamanho: string,
): string {
  return `${prefixoVariacao(p, tamanho)} - ${corOlist} - ${tamanho}`;
}

export function ordenarTamanhos(lista: string[]): string[] {
  const ordem = ORDEM_TAMANHOS as readonly string[];
  return [...lista].sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b));
}

/**
 * Todas as variações de um produto, na ordem cor e depois tamanho.
 * Cor não marcada no produto simplesmente não aparece.
 */
export function gerarVariacoes(
  p: ProdutoBiblioteca,
  cores: CorBiblioteca[],
): Variacao[] {
  const porId = new Map(cores.map((c) => [c.id, c]));
  const tamanhos = ordenarTamanhos(p.tamanhos);
  const marcadas = p.cores
    .map((pc) => ({ cor: porId.get(pc.cor_id), categoria: pc.categoria }))
    .filter((x): x is { cor: CorBiblioteca; categoria: Categoria } => !!x.cor)
    .sort((a, b) => a.cor.posicao - b.cor.posicao);

  const out: Variacao[] = [];
  for (const m of marcadas) {
    for (const t of tamanhos) {
      out.push({
        nome: nomeOficial(p, m.cor.nome_olist, t),
        cor: m.cor.nome,
        cor_olist: m.cor.nome_olist,
        tamanho: t,
        categoria: m.categoria,
        hex: m.cor.hex,
      });
    }
  }
  return out;
}

// ---------------- Tolerância sugerida ----------------

/**
 * Folga fixa por ponto, tirada da tabela oficial da Juff. Não é porcentagem.
 * Serve apenas como sugestão ao preencher uma linha nova. Nunca sobrescreve
 * valor já gravado.
 */
export function folgaSugerida(ponto: string, tamanho: string): number {
  if (ponto === "altura") {
    if (tamanho === "PP" || tamanho === "P") return 2;
    if (tamanho === "EXXG") return 4;
    return 3;
  }
  if (ponto === "manga") return 2;
  return 1;
}

// ---------------- Consultas ----------------

type LinhaProduto = Omit<ProdutoBiblioteca, "cores"> & {
  biblioteca_produto_cores: { cor_id: string; categoria: string }[] | null;
};

export const coresQueryOptions = queryOptions({
  queryKey: ["biblioteca", "cores"] as const,
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
  queryFn: async (): Promise<CorBiblioteca[]> => {
    const { data, error } = await supabase
      .from("biblioteca_cores")
      .select("id, nome, nome_olist, hex, posicao, ativo")
      .order("posicao", { ascending: true });
    if (error) throw error;
    return (data ?? []) as CorBiblioteca[];
  },
});

export const produtosQueryOptions = queryOptions({
  queryKey: ["biblioteca", "produtos"] as const,
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
  queryFn: async (): Promise<ProdutoBiblioteca[]> => {
    const { data, error } = await supabase
      .from("biblioteca_produtos")
      .select(
        "id, nome_base, tecido, usa_tecido, sufixo, usa_sufixo, usa_xtra, tamanhos_xtra, tamanhos, pontos, posicao, ativo, biblioteca_produto_cores(cor_id, categoria)",
      )
      .order("posicao", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as unknown as LinhaProduto[]).map((l) => ({
      id: l.id,
      nome_base: l.nome_base,
      tecido: l.tecido,
      usa_tecido: l.usa_tecido,
      sufixo: l.sufixo,
      usa_sufixo: l.usa_sufixo,
      usa_xtra: l.usa_xtra,
      tamanhos_xtra: l.tamanhos_xtra ?? [],
      tamanhos: l.tamanhos ?? [],
      pontos: l.pontos ?? [],
      posicao: l.posicao,
      ativo: l.ativo,
      cores: (l.biblioteca_produto_cores ?? []).map((c) => ({
        cor_id: c.cor_id,
        categoria: (c.categoria === "Outlet" ? "Outlet" : "Normal") as Categoria,
      })),
    }));
  },
});

export function medidasQueryOptions(produtoId: string) {
  return queryOptions({
    queryKey: ["biblioteca", "medidas", produtoId] as const,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Medida[]> => {
      const { data, error } = await supabase
        .from("biblioteca_medidas")
        .select("produto_id, ponto, tamanho, minimo, alvo, maximo")
        .eq("produto_id", produtoId);
      if (error) throw error;
      return (data ?? []) as Medida[];
    },
  });
}

// ---------------- Gravações ----------------

/** Grava só os campos que mudaram na ficha do produto. */
export async function salvarProduto(
  id: string,
  patch: Partial<
    Pick<
      ProdutoBiblioteca,
      | "nome_base"
      | "tecido"
      | "usa_tecido"
      | "sufixo"
      | "usa_sufixo"
      | "usa_xtra"
      | "tamanhos_xtra"
      | "tamanhos"
      | "pontos"
      | "ativo"
    >
  >,
) {
  const { error } = await supabase.from("biblioteca_produtos").update(patch).eq("id", id);
  if (error) throw error;
}

/** Lote de cores de um produto em uma chamada só. */
export async function salvarCores(produtoId: string, cores: ProdutoCor[]) {
  const { error } = await supabase.rpc("biblioteca_salvar_cores", {
    p_produto_id: produtoId,
    p_cores: cores,
  });
  if (error) throw error;
}

/** Lote de medidas de um produto em uma chamada só. */
export async function salvarMedidas(
  produtoId: string,
  medidas: { ponto: string; tamanho: string; minimo: string; alvo: string; maximo: string }[],
) {
  const { error } = await supabase.rpc("biblioteca_salvar_medidas", {
    p_produto_id: produtoId,
    p_medidas: medidas,
  });
  if (error) throw error;
}

export async function criarProduto(nomeBase: string) {
  const { data, error } = await supabase
    .from("biblioteca_produtos")
    .insert({
      nome_base: nomeBase,
      tamanhos: ["P", "M", "G", "GG"],
      pontos: ["altura", "largura"],
      posicao: 999,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function criarCor(nome: string, nomeOlist: string, hex: string, posicao: number) {
  const { error } = await supabase
    .from("biblioteca_cores")
    .insert({ nome, nome_olist: nomeOlist, hex, posicao });
  if (error) throw error;
}

export async function salvarCor(
  id: string,
  patch: Partial<Pick<CorBiblioteca, "nome" | "nome_olist" | "hex" | "posicao" | "ativo">>,
) {
  const { error } = await supabase.from("biblioteca_cores").update(patch).eq("id", id);
  if (error) throw error;
}
