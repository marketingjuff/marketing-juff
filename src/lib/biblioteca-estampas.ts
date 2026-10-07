import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type CorBiblioteca, type ProdutoBiblioteca } from "@/lib/biblioteca";

const DEPOSITO = "marca";
const CINCO_MIN = 5 * 60 * 1000;

export const GENEROS = ["masculino", "feminino", "unissex", "infantil"] as const;
export type Genero = (typeof GENEROS)[number];
export const ROTULO_GENERO: Record<Genero, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
  unissex: "Unissex",
  infantil: "Infantil",
};

/** Cores com que toda estampa nova nasce, nesta ordem. */
export const CORES_OBRIGATORIAS = ["preto", "branco", "marinho", "verde militar", "bordô", "cinza chumbo"];

export type CategoriaEstampa = { id: string; nome: string; posicao: number; ativo: boolean };

export type Estampa = {
  id: string;
  nome: string;
  categoria_id: string | null;
  imagem_caminho: string | null;
  ficha_caminho: string | null;
  tamanho_adulto: string;
  tamanho_feminino: string;
  tamanho_infantil: string;
  situacao: "ativo" | "descontinuado";
  posicao: number;
  tipo: "codigo" | "cromia";
};

export type EstampaResumo = Estampa & { n_papeis: number; n_modelos: number; n_cores: number };

export type ItemCor = { codigo: string; c: number; m: number; y: number; k: number };
export type Papel = { id: string; ordem: number; nome: string };
export type Grupo = { id: string; nome: string; posicao: number; modelos: string[]; cores: string[] };
export type Receita = { id: string; grupo_id: string; cor_id: string; combo_id: string | null; publico: "menino" | "menina" | null; itens: ItemCor[] };

export type EstampaCompleta = Estampa & {
  papeis: Papel[];
  grupos: Grupo[];
  cores: string[];
  receitas: Receita[];
};

export type Combo = {
  id: string;
  codigo: string;
  genero: Genero;
  cor_id: string | null;
  posicao: number;
  itens: ItemCor[];
  uso: number;
  estampas: string[];
};

// ---------------- Consultas ----------------

export const categoriasEstampaQueryOptions = queryOptions({
  queryKey: ["biblioteca", "estampa-categorias"] as const,
  staleTime: CINCO_MIN,
  refetchOnWindowFocus: false,
  queryFn: async (): Promise<CategoriaEstampa[]> => {
    const { data, error } = await supabase
      .from("biblioteca_estampa_categorias")
      .select("id, nome, posicao, ativo")
      .order("posicao");
    if (error) throw error;
    return data ?? [];
  },
});

const CAMPOS = "id, nome, categoria_id, imagem_caminho, ficha_caminho, tamanho_adulto, tamanho_feminino, tamanho_infantil, situacao, posicao, tipo";

export const estampasQueryOptions = queryOptions({
  queryKey: ["biblioteca", "estampas-lista"] as const,
  staleTime: CINCO_MIN,
  refetchOnWindowFocus: false,
  queryFn: async (): Promise<EstampaResumo[]> => {
    const [e, p, m, c] = await Promise.all([
      supabase.from("biblioteca_estampas").select(CAMPOS).order("posicao").order("nome"),
      supabase.from("biblioteca_estampa_papeis").select("estampa_id"),
      supabase.from("biblioteca_estampa_grupo_modelos").select("estampa_id"),
      supabase.from("biblioteca_estampa_cores_camiseta").select("estampa_id"),
    ]);
    for (const r of [e, p, m, c]) if (r.error) throw r.error;
    const conta = (rows: { estampa_id: string }[] | null) => {
      const mapa = new Map<string, number>();
      for (const r of rows ?? []) mapa.set(r.estampa_id, (mapa.get(r.estampa_id) ?? 0) + 1);
      return mapa;
    };
    const np = conta(p.data), nm = conta(m.data), nc = conta(c.data);
    return ((e.data ?? []) as unknown as Estampa[]).map((x) => ({
      ...x,
      n_papeis: np.get(x.id) ?? 0,
      n_modelos: nm.get(x.id) ?? 0,
      n_cores: nc.get(x.id) ?? 0,
    }));
  },
});

export function estampaQueryOptions(id: string) {
  return queryOptions({
    queryKey: ["biblioteca", "estampa", id, "v2"] as const,
    staleTime: CINCO_MIN,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<EstampaCompleta> => {
      const [e, p, g, gm, cc, r] = await Promise.all([
        supabase.from("biblioteca_estampas").select(CAMPOS).eq("id", id).single(),
        supabase.from("biblioteca_estampa_papeis").select("id, ordem, nome").eq("estampa_id", id).order("ordem"),
        supabase.from("biblioteca_estampa_grupos").select("id, nome, posicao").eq("estampa_id", id).order("posicao"),
        supabase.from("biblioteca_estampa_grupo_modelos").select("grupo_id, produto_id").eq("estampa_id", id),
        supabase.from("biblioteca_estampa_cores_camiseta").select("cor_id, posicao").eq("estampa_id", id).order("posicao"),
        supabase.from("biblioteca_estampa_receitas").select("id, grupo_id, cor_id, combo_id, publico").eq("estampa_id", id),
      ]);
      for (const x of [e, p, g, gm, cc, r]) if (x.error) throw x.error;
      const gids = (g.data ?? []).map((x) => x.id);
      const gc = gids.length
        ? await supabase
            .from("biblioteca_estampa_grupo_cores")
            .select("grupo_id, cor_id, posicao")
            .in("grupo_id", gids)
            .order("posicao")
        : { data: [], error: null };
      if (gc.error) throw gc.error;
      const ids = (r.data ?? []).map((x) => x.id);
      const itens = ids.length
        ? await supabase
            .from("biblioteca_estampa_receita_itens")
            .select("receita_id, ordem, codigo, c, m, y, k")
            .in("receita_id", ids)
            .order("ordem")
        : { data: [], error: null };
      if (itens.error) throw itens.error;
      const porReceita = new Map<string, ItemCor[]>();
      for (const it of itens.data ?? []) {
        const l = porReceita.get(it.receita_id) ?? [];
        l.push({ codigo: it.codigo, c: it.c, m: it.m, y: it.y, k: it.k });
        porReceita.set(it.receita_id, l);
      }
      return {
        ...(e.data as unknown as Estampa),
        papeis: p.data ?? [],
        grupos: (g.data ?? []).map((x) => ({
          ...x,
          modelos: (gm.data ?? []).filter((m) => m.grupo_id === x.id).map((m) => m.produto_id),
          cores: (gc.data ?? []).filter((c) => c.grupo_id === x.id).map((c) => c.cor_id),
        })),
        cores: (cc.data ?? []).map((x) => x.cor_id),
        receitas: (r.data ?? []).map((x) => ({ ...x, publico: x.publico as Receita["publico"], itens: porReceita.get(x.id) ?? [] })),
      };
    },
  });
}

export type PendenciasEstampa = {
  esperadas: number;
  receitas: { itens: number; sem_codigo: boolean; combo: boolean }[];
};

/** Células da grade por estampa: quantas existem e quais receitas estão incompletas ou sem CB. */
export const pendenciasEstampasQueryOptions = queryOptions({
  // Prefixo do K_LISTA: invalidar "estampas-lista" atualiza isto junto.
  queryKey: ["biblioteca", "estampas-lista", "pendencias"] as const,
  staleTime: CINCO_MIN,
  refetchOnWindowFocus: false,
  queryFn: async (): Promise<Record<string, PendenciasEstampa>> => {
    const todas = async <T>(tabela: string, campos: string): Promise<T[]> => {
      const out: T[] = [];
      for (let de = 0; ; de += 1000) {
        const r = await supabase.from(tabela).select(campos).range(de, de + 999);
        if (r.error) throw r.error;
        out.push(...((r.data ?? []) as T[]));
        if ((r.data ?? []).length < 1000) return out;
      }
    };
    const [g, gc, rs, its] = await Promise.all([
      todas<{ id: string; estampa_id: string }>("biblioteca_estampa_grupos", "id, estampa_id"),
      todas<{ grupo_id: string; cor_id: string }>("biblioteca_estampa_grupo_cores", "grupo_id, cor_id"),
      todas<{ id: string; estampa_id: string; combo_id: string | null }>("biblioteca_estampa_receitas", "id, estampa_id, combo_id"),
      todas<{ receita_id: string; codigo: string }>("biblioteca_estampa_receita_itens", "receita_id, codigo"),
    ]);
    const estampaDoGrupo = new Map(g.map((x) => [x.id, x.estampa_id]));
    const celulas = new Map<string, Set<string>>();
    for (const x of gc) {
      const eid = estampaDoGrupo.get(x.grupo_id);
      if (!eid) continue;
      const set = celulas.get(eid) ?? new Set<string>();
      set.add(`${x.grupo_id}:${x.cor_id}`);
      celulas.set(eid, set);
    }
    const receitaItens = new Map<string, { itens: number; sem_codigo: boolean }>();
    for (const it of its) {
      const atual = receitaItens.get(it.receita_id) ?? { itens: 0, sem_codigo: false };
      atual.itens += 1;
      if (!it.codigo.trim()) atual.sem_codigo = true;
      receitaItens.set(it.receita_id, atual);
    }
    const saida: Record<string, PendenciasEstampa> = {};
    for (const r of rs) {
      const e = saida[r.estampa_id] ?? (saida[r.estampa_id] = { esperadas: celulas.get(r.estampa_id)?.size ?? 0, receitas: [] });
      const c = receitaItens.get(r.id);
      e.receitas.push({ itens: c?.itens ?? 0, sem_codigo: c?.sem_codigo ?? false, combo: !!r.combo_id });
    }
    for (const eid of celulas.keys()) if (!(eid in saida)) saida[eid] = { esperadas: celulas.get(eid)!.size, receitas: [] };
    return saida;
  },
});

export const combosQueryOptions = queryOptions({
  queryKey: ["biblioteca", "combos"] as const,
  staleTime: CINCO_MIN,
  refetchOnWindowFocus: false,
  queryFn: async (): Promise<Combo[]> => {
    // O banco devolve no máximo 1000 linhas por vez; busca em páginas para não cortar cores dos combos.
    const todosItens = async () => {
      const out: { combo_id: string; ordem: number; codigo: string; c: number; m: number; y: number; k: number }[] = [];
      for (let de = 0; ; de += 1000) {
        const r = await supabase.from("biblioteca_combo_itens").select("combo_id, ordem, codigo, c, m, y, k")
          .order("combo_id").order("ordem").range(de, de + 999);
        if (r.error) throw r.error;
        out.push(...(r.data ?? []));
        if ((r.data ?? []).length < 1000) return { data: out, error: null };
      }
    };
    const todosCombos = async () => {
      const out: { id: string; codigo: string; genero: string; cor_id: string | null; posicao: number }[] = [];
      for (let de = 0; ; de += 1000) {
        const r = await supabase.from("biblioteca_combos").select("id, codigo, genero, cor_id, posicao").order("posicao").range(de, de + 999);
        if (r.error) throw r.error;
        out.push(...(r.data ?? []));
        if ((r.data ?? []).length < 1000) return { data: out, error: null };
      }
    };
    const [c, i, u] = await Promise.all([todosCombos(), todosItens(), supabase.rpc("biblioteca_combo_uso")]);
    if (u.error) throw u.error;
    const itens = new Map<string, ItemCor[]>();
    for (const it of i.data ?? []) {
      const l = itens.get(it.combo_id) ?? [];
      l.push({ codigo: it.codigo, c: it.c, m: it.m, y: it.y, k: it.k });
      itens.set(it.combo_id, l);
    }
    const uso = new Map((u.data ?? []).map((x) => [x.combo_id, x]));
    return (c.data ?? []).map((x) => ({
      ...x,
      genero: x.genero as Genero,
      itens: itens.get(x.id) ?? [],
      uso: Number(uso.get(x.id)?.total ?? 0),
      estampas: uso.get(x.id)?.estampas ?? [],
    }));
  },
});

// ---------------- Regras ----------------

export function generoDoProduto(p: Pick<ProdutoBiblioteca, "nome_base">): Genero {
  const n = p.nome_base.toLowerCase();
  if (n.includes("infantil")) return "infantil";
  if (n.includes("feminina") || n.includes("baby look")) return "feminino";
  return "masculino";
}

export function generoDoGrupo(modelos: string[], produtos: ProdutoBiblioteca[]): Genero | null {
  const g = new Set(
    modelos.map((id) => produtos.find((p) => p.id === id)).filter(Boolean).map((p) => generoDoProduto(p!)),
  );
  if (g.size === 0) return null;
  if (g.size === 1) return [...g][0]!;
  return "unissex";
}

/** Juff Store - {Modelo} - {Tecido} - {Nome da estampa} - {Cor da camiseta} */
export function nomeProdutoEstampa(p: ProdutoBiblioteca, estampa: string, cor: CorBiblioteca): string {
  const modelo = p.usa_sufixo && p.sufixo ? `${p.nome_base} ${p.sufixo}` : p.nome_base;
  const partes = ["Juff Store", modelo];
  if (p.usa_tecido && p.tecido) partes.push(p.tecido);
  partes.push(estampa, cor.nome_olist);
  return partes.join(" - ");
}

export function textoCmykItem(i: ItemCor) {
  return `${i.c} ${i.m} ${i.y} ${i.k}`;
}

export function assinatura(itens: ItemCor[]) {
  return itens.map((i) => i.codigo.toUpperCase()).join("|");
}

// ---------------- Gravações ----------------

export async function salvarEstampa(id: string, patch: Partial<Omit<Estampa, "id">>) {
  const { error } = await supabase.from("biblioteca_estampas").update(patch).eq("id", id);
  if (error) throw error;
}

/** Nasce com três grupos, seis cores de camiseta e nenhuma receita. */
export async function criarEstampa(nome: string, cores: CorBiblioteca[]): Promise<string> {
  const { data, error } = await supabase
    .from("biblioteca_estampas")
    .insert({ nome: nome.trim(), posicao: 999 })
    .select("id")
    .single();
  if (error) throw error;
  const id = data.id;
  const obrig = CORES_OBRIGATORIAS.map((n) => cores.find((c) => c.nome.toLowerCase() === n)).filter(Boolean) as CorBiblioteca[];
  const [g, c, p] = await Promise.all([
    supabase.from("biblioteca_estampa_grupos").insert(
      ["Masculino", "Feminino", "Infantil"].map((nome, i) => ({ estampa_id: id, nome, posicao: i })),
    ).select("id"),
    supabase.from("biblioteca_estampa_cores_camiseta").insert(obrig.map((c, i) => ({ estampa_id: id, cor_id: c.id, posicao: i }))),
    supabase.from("biblioteca_estampa_papeis").insert({ estampa_id: id, ordem: 1, nome: "Cor 1" }),
  ]);
  for (const x of [g, c, p]) if (x.error) throw x.error;
  const gc = (g.data ?? []).flatMap((gr) => obrig.map((cor, i) => ({ grupo_id: gr.id, cor_id: cor.id, posicao: i })));
  if (gc.length) {
    const { error: e2 } = await supabase.from("biblioteca_estampa_grupo_cores").insert(gc);
    if (e2) throw e2;
  }
  return id;
}

export async function apagarEstampa(id: string) {
  const { error } = await supabase.from("biblioteca_estampas").delete().eq("id", id);
  if (error) throw error;
}

/** Ajusta só a diferença: renomeia, acrescenta no fim ou tira do fim. */
export async function definirPapeis(estampaId: string, atuais: Papel[], nomes: string[]) {
  const ops: PromiseLike<{ error: unknown }>[] = [];
  nomes.forEach((nome, i) => {
    const ex = atuais.find((p) => p.ordem === i + 1);
    if (!ex) ops.push(supabase.from("biblioteca_estampa_papeis").insert({ estampa_id: estampaId, ordem: i + 1, nome }));
    else if (ex.nome !== nome) ops.push(supabase.from("biblioteca_estampa_papeis").update({ nome }).eq("id", ex.id));
  });
  if (atuais.length > nomes.length) {
    ops.push(supabase.from("biblioteca_estampa_papeis").delete().eq("estampa_id", estampaId).gt("ordem", nomes.length));
  }
  const res = await Promise.all(ops);
  for (const r of res) if (r.error) throw r.error;
}

export async function salvarGrupo(id: string, patch: { nome?: string; posicao?: number }) {
  const { error } = await supabase.from("biblioteca_estampa_grupos").update(patch).eq("id", id);
  if (error) throw error;
}

export async function criarGrupo(estampaId: string, nome: string, posicao: number): Promise<string> {
  const { data, error } = await supabase
    .from("biblioteca_estampa_grupos")
    .insert({ estampa_id: estampaId, nome, posicao })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function apagarGrupo(id: string) {
  const { error } = await supabase.from("biblioteca_estampa_grupos").delete().eq("id", id);
  if (error) throw error;
}

/** grupoId nulo tira o modelo da estampa. */
export async function moverModelo(estampaId: string, grupoId: string | null, produtoId: string) {
  const del = await supabase
    .from("biblioteca_estampa_grupo_modelos")
    .delete()
    .eq("estampa_id", estampaId)
    .eq("produto_id", produtoId);
  if (del.error) throw del.error;
  if (!grupoId) return;
  const { error } = await supabase
    .from("biblioteca_estampa_grupo_modelos")
    .insert({ estampa_id: estampaId, grupo_id: grupoId, produto_id: produtoId });
  if (error) throw error;
}

export async function definirCoresCamiseta(estampaId: string, atuais: string[], corIds: string[]) {
  const sair = atuais.filter((c) => !corIds.includes(c));
  const entrar = corIds.filter((c) => !atuais.includes(c));
  if (sair.length) {
    const { error } = await supabase
      .from("biblioteca_estampa_cores_camiseta")
      .delete()
      .eq("estampa_id", estampaId)
      .in("cor_id", sair);
    if (error) throw error;
  }
  if (entrar.length) {
    const { error } = await supabase
      .from("biblioteca_estampa_cores_camiseta")
      .insert(entrar.map((cor_id) => ({ estampa_id: estampaId, cor_id, posicao: corIds.indexOf(cor_id) })));
    if (error) throw error;
  }
}

export async function salvarReceita(estampaId: string, grupoId: string, corId: string, comboId: string | null, itens: ItemCor[]) {
  const { data, error } = await supabase.rpc("biblioteca_estampa_salvar_receita", {
    p_estampa_id: estampaId,
    p_grupo_id: grupoId,
    p_cor_id: corId,
    p_combo_id: comboId as string,
    p_itens: itens,
  });
  if (error) throw error;
  return data as string;
}

export async function registrarCombo(genero: Genero, corId: string | null, itens: ItemCor[]) {
  const { data, error } = await supabase.rpc("biblioteca_combo_registrar", {
    p_genero: genero,
    p_cor_id: corId as string,
    p_itens: itens,
  });
  if (error) throw error;
  const r = (data ?? [])[0];
  if (!r) throw new Error("Combo não registrado");
  return r as { id: string; codigo: string; criado: boolean };
}

export const criarCombo = registrarCombo;

export async function salvarCombo(id: string, patch: { genero?: Genero; cor_id?: string | null }, itens?: ItemCor[]) {
  if (Object.keys(patch).length) {
    const { error } = await supabase.from("biblioteca_combos").update(patch).eq("id", id);
    if (error) throw error;
  }
  if (itens) {
    const del = await supabase.from("biblioteca_combo_itens").delete().eq("combo_id", id).gt("ordem", itens.length);
    if (del.error) throw del.error;
    const { error } = await supabase
      .from("biblioteca_combo_itens")
      .upsert(itens.map((it, i) => ({ combo_id: id, ordem: i + 1, ...it })), { onConflict: "combo_id,ordem" });
    if (error) throw error;
  }
}

export async function apagarCombo(id: string) {
  const { error } = await supabase.from("biblioteca_combos").delete().eq("id", id);
  if (error) throw error;
}

export async function criarCategoria(nome: string, posicao: number): Promise<string> {
  const limpo = nome.trim();
  const { data: existente } = await supabase
    .from("biblioteca_estampa_categorias")
    .select("id")
    .ilike("nome", limpo)
    .maybeSingle();
  if (existente) return existente.id;
  const { data, error } = await supabase
    .from("biblioteca_estampa_categorias")
    .insert({ nome: limpo, posicao })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

// ---------------- Arquivos ----------------

export async function enviarArquivoEstampa(estampaId: string, tipo: "imagem" | "ficha", arquivo: File) {
  const ext = (arquivo.name.split(".").pop() ?? "bin").toLowerCase();
  const caminho = `estampas/${estampaId}/${tipo}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(DEPOSITO).upload(caminho, arquivo, { upsert: false });
  if (error) throw error;
  return caminho;
}

export async function removerArquivoEstampa(caminho: string) {
  await supabase.storage.from(DEPOSITO).remove([caminho]);
}

export function urlsEstampaQueryOptions(caminhos: string[]) {
  const chave = [...caminhos].sort();
  return queryOptions({
    queryKey: ["biblioteca", "estampa-urls", chave] as const,
    enabled: chave.length > 0,
    staleTime: 50 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase.storage.from(DEPOSITO).createSignedUrls(chave, 3600);
      if (error) throw error;
      const mapa: Record<string, string> = {};
      for (const i of data ?? []) if (i.path && i.signedUrl) mapa[i.path] = i.signedUrl;
      return mapa;
    },
  });
}

export async function salvarTipoEstampa(id: string, tipo: Estampa["tipo"]) {
  const { error } = await supabase.from("biblioteca_estampas").update({ tipo }).eq("id", id);
  if (error) throw error;
}

export async function salvarPublicoReceita(receitaId: string, publico: Receita["publico"]) {
  const { error } = await supabase.from("biblioteca_estampa_receitas").update({ publico }).eq("id", receitaId);
  if (error) throw error;
}

export async function apagarReceita(receitaId: string) {
  const { error } = await supabase.rpc("biblioteca_estampa_apagar_receita", { p_receita_id: receitaId });
  if (error) throw error;
}

export async function definirCoresGrupo(grupoId: string, atuais: string[], corIds: string[]) {
  const sair = atuais.filter((c) => !corIds.includes(c));
  const entrar = corIds.filter((c) => !atuais.includes(c));
  if (sair.length) {
    const { error } = await supabase
      .from("biblioteca_estampa_grupo_cores")
      .delete()
      .eq("grupo_id", grupoId)
      .in("cor_id", sair);
    if (error) throw error;
  }
  if (entrar.length) {
    const { error } = await supabase
      .from("biblioteca_estampa_grupo_cores")
      .insert(entrar.map((cor_id) => ({ grupo_id: grupoId, cor_id, posicao: corIds.indexOf(cor_id) })));
    if (error) throw error;
  }
}
