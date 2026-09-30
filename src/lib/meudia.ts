import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const BLOCOS_POR_DIA = 4;

export const DIAS_SEMANA = [
  { valor: "livre", label: "Livre" },
  { valor: "seg", label: "Segunda" },
  { valor: "ter", label: "Terça" },
  { valor: "qua", label: "Quarta" },
  { valor: "qui", label: "Quinta" },
  { valor: "sex", label: "Sexta" },
  { valor: "ultimo_dia_util", label: "Último dia útil do mês" },
] as const;

export type DiaSemana = (typeof DIAS_SEMANA)[number]["valor"];

export type Recorrente = {
  id: string;
  descricao: string;
  vezes_mes: number;
  blocos: number;
  dia_semana: DiaSemana;
  hora: string | null;
  ativo: boolean;
  posicao: number;
};

export type ItemDia = {
  id: string;
  data: string;
  bloco_inicio: number;
  blocos: number;
  texto: string;
  card_id: string | null;
  recorrente_id: string | null;
  feito: boolean;
};

export type RelatoDia = {
  data: string;
  modo: "P" | "HO" | null;
  texto: string;
};

const PADRAO = { staleTime: 60_000, refetchOnWindowFocus: false } as const;

// ---------------- datas ----------------

export function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const NOMES_DIA = ["SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA"];

/** Semanas de segunda a sexta que tocam o mês. */
export function semanasDoMes(ano: number, mes: number): string[][] {
  const primeiro = new Date(ano, mes - 1, 1);
  const ultimo = new Date(ano, mes, 0);
  const cursor = new Date(primeiro);
  // recua até a segunda-feira daquela semana
  const recuo = (cursor.getDay() + 6) % 7;
  cursor.setDate(cursor.getDate() - recuo);

  const semanas: string[][] = [];
  while (cursor <= ultimo) {
    const semana: string[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(cursor);
      d.setDate(d.getDate() + i);
      semana.push(iso(d));
    }
    semanas.push(semana);
    cursor.setDate(cursor.getDate() + 7);
  }
  return semanas;
}

export function mesDe(dataIso: string): number {
  return Number(dataIso.slice(5, 7));
}

// ---------------- feriados ----------------

export const feriadosQueryOptions = queryOptions({
  queryKey: ["meudia", "feriados"],
  queryFn: async (): Promise<Record<string, string>> => {
    const { data, error } = await supabase.from("feriados").select("data, descricao");
    if (error) throw error;
    const out: Record<string, string> = {};
    for (const f of data ?? []) out[f.data] = f.descricao ?? "";
    return out;
  },
  staleTime: 10 * 60_000,
  refetchOnWindowFocus: false,
});

export async function criarFeriado(data: string, descricao: string): Promise<void> {
  const { error } = await supabase.from("feriados").insert({ data, descricao });
  if (error) throw error;
}

export async function excluirFeriado(data: string): Promise<void> {
  const { error } = await supabase.from("feriados").delete().eq("data", data);
  if (error) throw error;
}

/** Busca os feriados nacionais do ano na BrasilAPI. */
export async function buscarFeriadosNacionais(
  ano: number,
): Promise<{ data: string; descricao: string }[]> {
  const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`);
  if (!res.ok) throw new Error("BrasilAPI indisponível");
  const arr = (await res.json()) as { date: string; name: string }[];
  return arr.map((f) => ({ data: f.date, descricao: f.name }));
}

/** Acrescenta os que faltam, nunca duplica. Devolve quantos entraram. */
export async function importarFeriados(ano: number): Promise<number> {
  const vindos = await buscarFeriadosNacionais(ano);
  const { data: jaTem } = await supabase
    .from("feriados")
    .select("data")
    .gte("data", `${ano}-01-01`)
    .lte("data", `${ano}-12-31`);
  const existentes = new Set((jaTem ?? []).map((f) => f.data));
  const novos = vindos.filter((f) => !existentes.has(f.data));
  if (novos.length === 0) return 0;
  const { error } = await supabase.from("feriados").insert(novos);
  if (error) throw error;
  return novos.length;
}

// ---------------- recorrentes ----------------

export const recorrentesQueryOptions = queryOptions({
  queryKey: ["meudia", "recorrentes"],
  queryFn: async (): Promise<Recorrente[]> => {
    const { data, error } = await supabase
      .from("meudia_recorrentes")
      .select("id, descricao, vezes_mes, blocos, dia_semana, hora, ativo, posicao")
      .order("posicao", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Recorrente[];
  },
  ...PADRAO,
});

export async function criarRecorrente(descricao: string, posicao: number): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("meudia_recorrentes")
    .insert({ user_id: auth.user?.id, descricao, posicao });
  if (error) throw error;
}

export async function atualizarRecorrente(
  id: string,
  patch: Partial<Pick<Recorrente, "descricao" | "vezes_mes" | "blocos" | "dia_semana" | "hora" | "ativo">>,
): Promise<void> {
  const { error } = await supabase.from("meudia_recorrentes").update(patch).eq("id", id);
  if (error) throw error;
}

export async function excluirRecorrente(id: string): Promise<void> {
  const { error } = await supabase.from("meudia_recorrentes").delete().eq("id", id);
  if (error) throw error;
}

export async function reordenarRecorrentes(ids: string[]): Promise<void> {
  const { error } = await supabase.rpc("meudia_reordenar_recorrentes", { _ids: ids });
  if (error) throw error;
}

// ---------------- itens dos blocos ----------------

export const itensQueryOptions = (de: string, ate: string) =>
  queryOptions({
    queryKey: ["meudia", "itens", de, ate],
    queryFn: async (): Promise<ItemDia[]> => {
      const { data, error } = await supabase
        .from("meudia_itens")
        .select("id, data, bloco_inicio, blocos, texto, card_id, recorrente_id, feito")
        .gte("data", de)
        .lte("data", ate)
        .order("bloco_inicio", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ItemDia[];
    },
    ...PADRAO,
  });

export async function criarItem(item: {
  data: string;
  bloco_inicio: number;
  blocos: number;
  texto: string;
  card_id: string | null;
  recorrente_id: string | null;
}): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("meudia_itens")
    .insert({ ...item, user_id: auth.user?.id })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function atualizarItem(
  id: string,
  patch: Partial<Pick<ItemDia, "texto" | "blocos" | "bloco_inicio" | "data" | "feito">>,
): Promise<void> {
  const { error } = await supabase.from("meudia_itens").update(patch).eq("id", id);
  if (error) throw error;
}

export async function excluirItem(id: string): Promise<void> {
  const { error } = await supabase.from("meudia_itens").delete().eq("id", id);
  if (error) throw error;
}

/** Quantos blocos livres existem num dia, a partir de um bloco. */
export function livresApartirDe(itens: ItemDia[], dataIso: string, bloco: number): number {
  const ocupados = new Set<number>();
  for (const i of itens) {
    if (i.data !== dataIso) continue;
    for (let b = i.bloco_inicio; b < i.bloco_inicio + i.blocos; b++) ocupados.add(b);
  }
  let n = 0;
  for (let b = bloco; b <= BLOCOS_POR_DIA; b++) {
    if (ocupados.has(b)) break;
    n++;
  }
  return n;
}

/** Quantas vezes cada recorrente já foi encaixado num mês. */
export function contagemDoMes(itens: ItemDia[], ano: number, mes: number): Record<string, number> {
  const pref = `${ano}-${String(mes).padStart(2, "0")}`;
  const out: Record<string, number> = {};
  for (const i of itens) {
    if (!i.recorrente_id || !i.data.startsWith(pref)) continue;
    out[i.recorrente_id] = (out[i.recorrente_id] ?? 0) + 1;
  }
  return out;
}

// ---------------- diário ----------------

export const diarioQueryOptions = (de: string, ate: string) =>
  queryOptions({
    queryKey: ["meudia", "diario", de, ate],
    queryFn: async (): Promise<Record<string, RelatoDia>> => {
      const { data, error } = await supabase
        .from("meudia_diario")
        .select("data, modo, texto")
        .gte("data", de)
        .lte("data", ate);
      if (error) throw error;
      const out: Record<string, RelatoDia> = {};
      for (const r of data ?? []) out[r.data] = r as RelatoDia;
      return out;
    },
    ...PADRAO,
  });

export async function gravarDiario(
  data: string,
  modo: "P" | "HO" | null,
  texto: string,
): Promise<void> {
  const { error } = await supabase.rpc("meudia_gravar_diario", {
    _data: data, _modo: modo, _texto: texto,
  });
  if (error) throw error;
}
