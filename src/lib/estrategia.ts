import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Frente = "store" | "custom";

export const FRENTES: { valor: Frente; label: string }[] = [
  { valor: "store", label: "Juff Store" },
  { valor: "custom", label: "Juff Custom" },
];

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Ícones liberados para os campos da ata. Todos existem no lucide-react. */
export const ICONES_CAMPO = [
  "notebook-pen", "party-popper", "lightbulb", "tag", "shirt", "camera",
  "crown", "calendar-days", "users", "target", "trending-up", "dollar-sign",
  "package", "truck", "mail", "link", "palette", "image", "sparkles",
  "gift", "handshake", "building-2", "phone", "clipboard-list", "flag",
  "star", "heart", "rocket", "megaphone", "telescope",
] as const;

export type CampoEstrategia = {
  id: string;
  frente: Frente;
  label: string;
  icone: string;
  posicao: number;
  ativo: boolean;
  no_panorama: boolean;
};

export type DecisaoEstrategia = {
  id: string;
  ata_id: string;
  texto: string;
  responsavel_id: string | null;
  prazo: string | null;
  card_id: string | null;
  posicao: number;
};

export type AtaMensal = {
  id: string;
  frente: Frente;
  ano: number;
  mes: number;
  anotacoes: string;
  valores: Record<string, string>;
  decisoes: DecisaoEstrategia[];
};

/** Resumo de um mês para a grade dos doze. */
export type ResumoMes = {
  mes: number;
  existe: boolean;
  valores: Record<string, string>;
  decisoes: number;
};

const PADRAO = { staleTime: 60_000, refetchOnWindowFocus: false } as const;

// ---------------- catálogo de campos ----------------

export const camposQueryOptions = (frente: Frente) =>
  queryOptions({
    queryKey: ["estrategia", "campos", frente],
    queryFn: async (): Promise<CampoEstrategia[]> => {
      const { data, error } = await supabase
        .from("estrategia_campos")
        .select("id, frente, label, icone, posicao, ativo, no_panorama")
        .eq("frente", frente)
        .order("posicao", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CampoEstrategia[];
    },
    ...PADRAO,
  });

export async function criarCampo(frente: Frente, label: string, posicao: number): Promise<void> {
  const { error } = await supabase
    .from("estrategia_campos")
    .insert({ frente, label, posicao, icone: "notebook-pen" });
  if (error) throw error;
}

export async function atualizarCampo(
  id: string,
  patch: Partial<Pick<CampoEstrategia, "label" | "icone" | "ativo" | "no_panorama">>,
): Promise<void> {
  const { error } = await supabase.from("estrategia_campos").update(patch).eq("id", id);
  if (error) throw error;
}

export async function reordenarCampos(frente: Frente, ids: string[]): Promise<void> {
  const { error } = await supabase.rpc("estrategia_reordenar_campos", {
    _frente: frente,
    _ids: ids,
  });
  if (error) throw error;
}

// ---------------- ata de um mês ----------------

export const ataQueryOptions = (frente: Frente, ano: number, mes: number) =>
  queryOptions({
    queryKey: ["estrategia", "ata", frente, ano, mes],
    queryFn: async (): Promise<AtaMensal | null> => {
      const { data, error } = await supabase
        .from("estrategia_atas")
        .select(
          "id, frente, ano, mes, anotacoes, estrategia_valores(campo_id, valor), estrategia_decisoes(id, ata_id, texto, responsavel_id, prazo, card_id, posicao)",
        )
        .eq("frente", frente)
        .eq("ano", ano)
        .eq("mes", mes)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const valores: Record<string, string> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const v of ((data as any).estrategia_valores ?? [])) valores[v.campo_id] = v.valor ?? "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const decisoes = (((data as any).estrategia_decisoes ?? []) as DecisaoEstrategia[])
        .slice()
        .sort((a, b) => a.posicao - b.posicao);
      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        id: (data as any).id,
        frente,
        ano,
        mes,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        anotacoes: (data as any).anotacoes ?? "",
        valores,
        decisoes,
      };
    },
    ...PADRAO,
  });

export async function gravarValor(
  frente: Frente, ano: number, mes: number, campoId: string, valor: string,
): Promise<void> {
  const { error } = await supabase.rpc("estrategia_gravar_valor", {
    _frente: frente, _ano: ano, _mes: mes, _campo_id: campoId, _valor: valor,
  });
  if (error) throw error;
}

export async function gravarAnotacoes(
  frente: Frente, ano: number, mes: number, texto: string,
): Promise<void> {
  const { error } = await supabase.rpc("estrategia_gravar_anotacoes", {
    _frente: frente, _ano: ano, _mes: mes, _texto: texto,
  });
  if (error) throw error;
}

async function idDaAta(frente: Frente, ano: number, mes: number): Promise<string> {
  const { data, error } = await supabase.rpc("estrategia_ata_id", {
    _frente: frente, _ano: ano, _mes: mes,
  });
  if (error) throw error;
  return data as string;
}

// ---------------- decisões ----------------

export async function criarDecisao(
  frente: Frente, ano: number, mes: number, texto: string, posicao: number,
): Promise<void> {
  const ataId = await idDaAta(frente, ano, mes);
  const { error } = await supabase
    .from("estrategia_decisoes")
    .insert({ ata_id: ataId, texto, posicao });
  if (error) throw error;
}

export async function atualizarDecisao(
  id: string,
  patch: Partial<Pick<DecisaoEstrategia, "texto" | "responsavel_id" | "prazo" | "card_id">>,
): Promise<void> {
  const { error } = await supabase.from("estrategia_decisoes").update(patch).eq("id", id);
  if (error) throw error;
}

export async function excluirDecisao(id: string): Promise<void> {
  const { error } = await supabase.from("estrategia_decisoes").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Cria o card em Tarefas a partir da decisão e devolve o id do card.
 * Só é chamado quando a pessoa clica e confirma. Nada acontece sozinho.
 */
export async function decisaoVirarCard(params: {
  decisaoId: string;
  quadroId: string;
  colunaId: string;
  titulo: string;
  descricao: string;
  responsavelId: string | null;
  dataEntrega: string | null;
}): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const { data: ultimos } = await supabase
    .from("tarefa_cards")
    .select("posicao")
    .eq("coluna_id", params.colunaId)
    .order("posicao", { ascending: false })
    .limit(1);
  const posicao = (ultimos?.[0]?.posicao ?? -1) + 1;

  const { data, error } = await supabase
    .from("tarefa_cards")
    .insert({
      quadro_id: params.quadroId,
      coluna_id: params.colunaId,
      titulo: params.titulo,
      descricao: params.descricao,
      responsavel_id: params.responsavelId,
      data_entrega: params.dataEntrega,
      criado_por: auth.user?.id ?? null,
      posicao,
    })
    .select("id")
    .single();
  if (error) throw error;

  await atualizarDecisao(params.decisaoId, { card_id: data.id });
  return data.id as string;
}

/** Cards que ainda existem, entre os ids informados. Sustenta o vínculo da decisão. */
export const cardsVivosQueryOptions = (ids: string[]) =>
  queryOptions({
    queryKey: ["estrategia", "cards-vivos", [...ids].sort().join(",")],
    queryFn: async (): Promise<Record<string, { titulo: string; quadro_id: string }>> => {
      if (ids.length === 0) return {};
      const { data, error } = await supabase
        .from("tarefa_cards")
        .select("id, titulo, quadro_id")
        .in("id", ids);
      if (error) throw error;
      const out: Record<string, { titulo: string; quadro_id: string }> = {};
      for (const c of data ?? []) out[c.id] = { titulo: c.titulo, quadro_id: c.quadro_id };
      return out;
    },
    ...PADRAO,
  });

// ---------------- panorama do ano ----------------

export const panoramaQueryOptions = (frente: Frente, ano: number) =>
  queryOptions({
    queryKey: ["estrategia", "panorama", frente, ano],
    queryFn: async (): Promise<ResumoMes[]> => {
      const { data, error } = await supabase
        .from("estrategia_atas")
        .select("mes, estrategia_valores(campo_id, valor), estrategia_decisoes(id)")
        .eq("frente", frente)
        .eq("ano", ano);
      if (error) throw error;
      const mapa = new Map<number, ResumoMes>();
      for (const linha of data ?? []) {
        const valores: Record<string, string> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const v of ((linha as any).estrategia_valores ?? [])) {
          if ((v.valor ?? "").trim()) valores[v.campo_id] = v.valor;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dec = ((linha as any).estrategia_decisoes ?? []).length;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mes = (linha as any).mes as number;
        mapa.set(mes, {
          mes,
          existe: Object.keys(valores).length > 0 || dec > 0,
          valores,
          decisoes: dec,
        });
      }
      return Array.from({ length: 12 }, (_, i) =>
        mapa.get(i + 1) ?? { mes: i + 1, existe: false, valores: {}, decisoes: 0 },
      );
    },
    ...PADRAO,
  });

/** Lembra a última frente usada, por pessoa, no próprio navegador. */
const CHAVE_FRENTE = "juff.estrategia.frente";

export function frenteSalva(): Frente {
  try {
    const v = localStorage.getItem(CHAVE_FRENTE);
    return v === "custom" ? "custom" : "store";
  } catch {
    return "store";
  }
}

export function salvarFrente(f: Frente): void {
  try {
    localStorage.setItem(CHAVE_FRENTE, f);
  } catch {
    // navegador sem storage, segue sem lembrar
  }
}
