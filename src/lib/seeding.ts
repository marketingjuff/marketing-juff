import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const MOTIVOS = ["Brinde", "Captação", "Ensaio", "Evento", "Parceria", "Seeding"] as const;

export const MARCAS = ["pedido", "produzida", "enviada", "captada", "retorna", "devolvida"] as const;
export type Marca = (typeof MARCAS)[number];

export type Peca = {
  id: string;
  remessa_id: string;
  produto_id: string | null;
  produto_nome: string | null;
  cor_id: string | null;
  cor_nome: string | null;
  tamanho: string | null;
  estampa_id: string | null;
  estampa_nome: string | null;
  pessoa: string | null;
  pedido: boolean;
  produzida: boolean;
  enviada: boolean;
  captada: boolean;
  retorna: boolean;
  devolvida: boolean;
  observacao: string | null;
  posicao: number;
};

export type Remessa = { id: string; mes: string; motivo: string; observacao: string | null; pecas: Peca[] };
export type Custo = { mes: string; valor: number };
export type Painel = {
  total: number;
  custo: number;
  aguardando: number;
  retorna: number;
  a_devolver: number;
  pessoas: { pessoa: string; qtd: number }[];
};

const BASE = { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false } as const;

/** "2026-10-01" a partir de ano e mês (0-11). */
export function mesIso(ano: number, mes: number): string {
  const d = new Date(Date.UTC(ano, mes, 1));
  return d.toISOString().slice(0, 10);
}
export function somarMeses(iso: string, n: number): string {
  const [a, m] = iso.split("-").map(Number);
  return mesIso(a!, m! - 1 + n);
}
export function mesAtualIso(): string {
  const d = new Date();
  return mesIso(d.getFullYear(), d.getMonth());
}
export function nomeMes(iso: string): string {
  const [a, m] = iso.split("-").map(Number);
  const n = new Date(a!, m! - 1, 1).toLocaleDateString("pt-BR", { month: "long" });
  return `${n.charAt(0).toUpperCase()}${n.slice(1)} de ${a}`;
}
export function reais(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
export function normalizar(t: string | null | undefined): string {
  return (t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function remessasKey(de: string, ate: string) {
  return ["seeding", "remessas", de, ate] as const;
}

export function remessasQueryOptions(de: string, ate: string) {
  return queryOptions({
    ...BASE,
    queryKey: remessasKey(de, ate),
    queryFn: async (): Promise<Remessa[]> => {
      const { data, error } = await supabase
        .from("social_seeding_remessas")
        .select("id, mes, motivo, observacao, social_seeding_pecas(*)")
        .gte("mes", de)
        .lte("mes", ate)
        .order("mes", { ascending: false })
        .order("motivo", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        mes: r.mes,
        motivo: r.motivo,
        observacao: r.observacao,
        pecas: ((r.social_seeding_pecas ?? []) as Peca[]).sort(
          (a, b) => a.posicao - b.posicao || 0,
        ),
      }));
    },
  });
}

export function painelQueryOptions(de: string, ate: string) {
  return queryOptions({
    ...BASE,
    queryKey: ["seeding", "painel", de, ate] as const,
    queryFn: async (): Promise<Painel> => {
      const { data, error } = await supabase.rpc("social_seeding_painel", { p_de: de, p_ate: ate });
      if (error) throw error;
      const d = (data ?? {}) as Partial<Painel>;
      return {
        total: Number(d.total ?? 0),
        custo: Number(d.custo ?? 0),
        aguardando: Number(d.aguardando ?? 0),
        retorna: Number(d.retorna ?? 0),
        a_devolver: Number(d.a_devolver ?? 0),
        pessoas: d.pessoas ?? [],
      };
    },
  });
}

export const custosQueryOptions = queryOptions({
  ...BASE,
  queryKey: ["seeding", "custos"] as const,
  queryFn: async (): Promise<Custo[]> => {
    const { data, error } = await supabase.from("social_seeding_custos").select("mes, valor").order("mes", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((c) => ({ mes: c.mes, valor: Number(c.valor) }));
  },
});

/** Custo vigente num mês: o exato ou o último anterior. */
export function custoDoMes(custos: Custo[], mes: string): number {
  return custos.find((c) => c.mes <= mes)?.valor ?? 0;
}

export const pessoasQueryOptions = queryOptions({
  ...BASE,
  queryKey: ["seeding", "pessoas"] as const,
  queryFn: async (): Promise<string[]> => {
    const { data, error } = await supabase.from("social_seeding_pecas").select("pessoa").not("pessoa", "is", null).limit(5000);
    if (error) throw error;
    const cont = new Map<string, { nome: string; n: number }>();
    for (const r of data ?? []) {
      const k = normalizar(r.pessoa);
      if (!k) continue;
      const e = cont.get(k) ?? { nome: r.pessoa!, n: 0 };
      e.n++;
      cont.set(k, e);
    }
    return [...cont.values()].sort((a, b) => b.n - a.n).map((e) => e.nome);
  },
});

export const estampasSimplesQueryOptions = queryOptions({
  ...BASE,
  queryKey: ["seeding", "estampas"] as const,
  queryFn: async () => {
    const { data, error } = await supabase.from("biblioteca_estampas").select("id, nome").order("nome");
    if (error) throw error;
    return data ?? [];
  },
});

// ---------------- Gravações ----------------

function falhou(e: unknown) {
  toast.error(e instanceof Error ? e.message : "Não foi possível gravar.");
}

/** Invalida só o painel e as remessas do período visível. */
export function invalidarPeriodo(qc: QueryClient, de: string, ate: string) {
  void qc.invalidateQueries({ queryKey: ["seeding", "painel", de, ate], exact: true });
}

function mexerRemessas(qc: QueryClient, de: string, ate: string, fn: (r: Remessa[]) => Remessa[]) {
  const key = remessasKey(de, ate);
  const antes = qc.getQueryData<Remessa[]>(key);
  if (antes) qc.setQueryData<Remessa[]>(key, fn(antes));
  return () => qc.setQueryData(key, antes);
}

export async function criarRemessa(qc: QueryClient, de: string, ate: string, mes: string, motivo: string) {
  const { data, error } = await supabase
    .from("social_seeding_remessas")
    .insert({ mes, motivo, criado_por: (await supabase.auth.getUser()).data.user?.id ?? null })
    .select("id, mes, motivo, observacao")
    .single();
  if (error) return falhou(error);
  mexerRemessas(qc, de, ate, (rs) =>
    [...rs, { ...data, pecas: [] }].sort((a, b) => (a.mes === b.mes ? a.motivo.localeCompare(b.motivo) : b.mes.localeCompare(a.mes))),
  );
  void qc.invalidateQueries({ queryKey: remessasKey(de, ate), exact: true });
  return data.id;
}

export async function apagarRemessa(qc: QueryClient, de: string, ate: string, id: string) {
  const desfaz = mexerRemessas(qc, de, ate, (rs) => rs.filter((r) => r.id !== id));
  const { error } = await supabase.from("social_seeding_remessas").delete().eq("id", id);
  if (error) {
    desfaz();
    return falhou(error);
  }
  invalidarPeriodo(qc, de, ate);
}

export async function criarPeca(
  qc: QueryClient,
  de: string,
  ate: string,
  remessaId: string,
  dados: Partial<Peca>,
  depoisDe?: Peca,
): Promise<string | null> {
  const id = crypto.randomUUID();
  const rem = qc.getQueryData<Remessa[]>(remessasKey(de, ate))?.find((r) => r.id === remessaId);
  const pecas = rem?.pecas ?? [];
  let posicao = (pecas[pecas.length - 1]?.posicao ?? 0) + 10;
  const reposicionar: { id: string; posicao: number }[] = [];
  if (depoisDe) {
    const i = pecas.findIndex((p) => p.id === depoisDe.id);
    posicao = depoisDe.posicao + 1;
    pecas.slice(i + 1).forEach((p, k) => {
      if (p.posicao <= posicao + k) reposicionar.push({ id: p.id, posicao: posicao + k + 1 });
    });
  }
  const nova: Peca = {
    id, remessa_id: remessaId, produto_id: null, produto_nome: null, cor_id: null, cor_nome: null, tamanho: null,
    estampa_id: null, estampa_nome: null, pessoa: null, pedido: false, produzida: false, enviada: false,
    captada: false, retorna: false, devolvida: false, observacao: null, ...dados, posicao,
  };
  const mapa = new Map(reposicionar.map((r) => [r.id, r.posicao]));
  const desfaz = mexerRemessas(qc, de, ate, (rs) =>
    rs.map((r) =>
      r.id !== remessaId ? r : {
        ...r,
        pecas: [...r.pecas.map((p) => (mapa.has(p.id) ? { ...p, posicao: mapa.get(p.id)! } : p)), nova].sort((a, b) => a.posicao - b.posicao),
      },
    ),
  );
  for (const r of reposicionar) void supabase.from("social_seeding_pecas").update({ posicao: r.posicao }).eq("id", r.id);
  const { error } = await supabase.from("social_seeding_pecas").insert(nova);
  if (error) {
    desfaz();
    falhou(error);
    return null;
  }
  invalidarPeriodo(qc, de, ate);
  return id;
}

export async function alterarPeca(qc: QueryClient, de: string, ate: string, peca: Peca, patch: Partial<Peca>) {
  const p = { ...patch };
  if (p.retorna === false) p.devolvida = false;
  const desfaz = mexerRemessas(qc, de, ate, (rs) =>
    rs.map((r) => (r.id !== peca.remessa_id ? r : { ...r, pecas: r.pecas.map((x) => (x.id === peca.id ? { ...x, ...p } : x)) })),
  );
  const { error } = await supabase.from("social_seeding_pecas").update(p).eq("id", peca.id);
  if (error) {
    desfaz();
    return falhou(error);
  }
  invalidarPeriodo(qc, de, ate);
  if ("pessoa" in p) void qc.invalidateQueries({ queryKey: ["seeding", "pessoas"], exact: true });
}

export async function apagarPeca(qc: QueryClient, de: string, ate: string, peca: Peca) {
  const desfaz = mexerRemessas(qc, de, ate, (rs) =>
    rs.map((r) => (r.id !== peca.remessa_id ? r : { ...r, pecas: r.pecas.filter((x) => x.id !== peca.id) })),
  );
  const { error } = await supabase.from("social_seeding_pecas").delete().eq("id", peca.id);
  if (error) {
    desfaz();
    return falhou(error);
  }
  invalidarPeriodo(qc, de, ate);
}

export function duplicarPeca(qc: QueryClient, de: string, ate: string, peca: Peca) {
  return criarPeca(
    qc, de, ate, peca.remessa_id,
    {
      produto_id: peca.produto_id, produto_nome: peca.produto_nome, cor_id: peca.cor_id, cor_nome: peca.cor_nome,
      tamanho: peca.tamanho, estampa_id: peca.estampa_id, estampa_nome: peca.estampa_nome, pessoa: peca.pessoa,
    },
    peca,
  );
}

export async function marcarColuna(qc: QueryClient, de: string, ate: string, remessaId: string, campo: Marca, valor: boolean) {
  const desfaz = mexerRemessas(qc, de, ate, (rs) =>
    rs.map((r) =>
      r.id !== remessaId ? r : {
        ...r,
        pecas: r.pecas.map((p) => {
          const n = { ...p, [campo]: valor };
          if (campo === "devolvida" && !p.retorna) n.devolvida = false;
          if (campo === "retorna" && !valor) n.devolvida = false;
          return n;
        }),
      },
    ),
  );
  const { error } = await supabase.rpc("social_seeding_marcar_coluna", { p_remessa: remessaId, p_campo: campo, p_valor: valor });
  if (error) {
    desfaz();
    return falhou(error);
  }
  invalidarPeriodo(qc, de, ate);
}

export async function gravarCusto(qc: QueryClient, mes: string, valor: number) {
  const key = custosQueryOptions.queryKey;
  const antes = qc.getQueryData<Custo[]>(key);
  const lista = (antes ?? []).filter((c) => c.mes !== mes);
  qc.setQueryData<Custo[]>(key, [...lista, { mes, valor }].sort((a, b) => b.mes.localeCompare(a.mes)));
  const { error } = await supabase.from("social_seeding_custos").upsert({ mes, valor, updated_at: new Date().toISOString() });
  if (error) {
    qc.setQueryData(key, antes);
    return falhou(error);
  }
  void qc.invalidateQueries({ queryKey: ["seeding", "painel"] });
}
