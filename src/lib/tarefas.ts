import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FundoTipo = "solida" | "degrade";
export type Prioridade = "baixa" | "media" | "alta" | "maxima";
export type Esforco = "rapido" | "meio_dia" | "varios_dias";

export type Quadro = {
  id: string;
  nome: string;
  descricao: string;
  fundo_tipo: FundoTipo;
  fundo_cor1: string;
  fundo_cor2: string;
  posicao: number;
  arquivado: boolean;
  membros: string[];
  cards_total?: number;
};

export type Coluna = {
  id: string;
  quadro_id: string;
  nome: string;
  posicao: number;
  conclui: boolean;
  limite_wip: number | null;
  arquivado: boolean;
};

export type Etiqueta = { id: string; nome: string; cor: string; arquivado: boolean };

export type Card = {
  id: string;
  quadro_id: string;
  coluna_id: string;
  titulo: string;
  descricao: string;
  responsavel_id: string | null;
  data_inicio: string | null;
  data_entrega: string | null;
  prioridade: Prioridade | null;
  esforco: Esforco | null;
  adiado_ate: string | null;
  depende_de: string;
  link_externo: string;
  posicao: number;
  concluido: boolean;
  coluna_desde: string;
  arquivado: boolean;
  etiquetas: string[];
  checklist_total: number;
  checklist_feitos: number;
  comentarios_total: number;
  anexos_total: number;
};

export type CardComContexto = Card & { quadro_nome: string; coluna_nome: string };

export type Pessoa = { id: string; nome: string; role: string };

export const PRIORIDADES: { valor: Prioridade; label: string; cor: string }[] = [
  { valor: "baixa", label: "Baixa", cor: "#888780" },
  { valor: "media", label: "Média", cor: "#378add" },
  { valor: "alta", label: "Alta", cor: "#ef9f27" },
  { valor: "maxima", label: "Máxima", cor: "#e24b4a" },
];

export const ESFORCOS: { valor: Esforco; label: string }[] = [
  { valor: "rapido", label: "Rápido" },
  { valor: "meio_dia", label: "Meio dia" },
  { valor: "varios_dias", label: "Vários dias" },
];

/** Paleta de fundo de quadro. Sempre hexadecimal com cerquilha e seis dígitos. */
export const FUNDOS_QUADRO: { nome: string; cor1: string; cor2: string }[] = [
  { nome: "Azul", cor1: "#185fa5", cor2: "#042c53" },
  { nome: "Verde", cor1: "#0f6e56", cor2: "#04342c" },
  { nome: "Coral", cor1: "#993c1d", cor2: "#4a1b0c" },
  { nome: "Roxo", cor1: "#534ab7", cor2: "#26215c" },
  { nome: "Rosa", cor1: "#993556", cor2: "#4b1528" },
  { nome: "Âmbar", cor1: "#854f0b", cor2: "#412402" },
  { nome: "Cinza", cor1: "#5f5e5a", cor2: "#2c2c2a" },
  { nome: "Marinho Juff", cor1: "#1d2546", cor2: "#0b0f20" },
];

/** Dias parados na mesma coluna a partir dos quais o card acende alerta. */
export const DIAS_PARADO_ALERTA = 5;

export const HEX_RE = /^#[0-9a-f]{6}$/;

// ---------------- helpers ----------------

async function uid(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

const CARD_SELECT =
  "*, tarefa_card_etiquetas(etiqueta_id), tarefa_checklist(feito), tarefa_comentarios(id), tarefa_anexos(id)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCard(c: any): Card {
  const checklist = (c.tarefa_checklist ?? []) as { feito: boolean }[];
  return {
    id: c.id,
    quadro_id: c.quadro_id,
    coluna_id: c.coluna_id,
    titulo: c.titulo ?? "",
    descricao: c.descricao ?? "",
    responsavel_id: c.responsavel_id,
    data_inicio: c.data_inicio,
    data_entrega: c.data_entrega,
    prioridade: c.prioridade,
    esforco: c.esforco,
    adiado_ate: c.adiado_ate,
    depende_de: c.depende_de ?? "",
    link_externo: c.link_externo ?? "",
    posicao: c.posicao,
    concluido: c.concluido,
    coluna_desde: c.coluna_desde,
    arquivado: c.arquivado,
    etiquetas: (c.tarefa_card_etiquetas ?? []).map((e: { etiqueta_id: string }) => e.etiqueta_id),
    checklist_total: checklist.length,
    checklist_feitos: checklist.filter((i) => i.feito).length,
    comentarios_total: (c.tarefa_comentarios ?? []).length,
    anexos_total: (c.tarefa_anexos ?? []).length,
  };
}

// ---------------- pessoas ----------------

export const pessoasQueryOptions = queryOptions({
  queryKey: ["tarefas", "pessoas"],
  queryFn: async (): Promise<Pessoa[]> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, nome, role")
      .order("nome", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Pessoa[];
  },
  staleTime: 60_000,
});

// ---------------- quadros ----------------

async function fetchQuadros(arquivado: boolean): Promise<Quadro[]> {
  const { data, error } = await supabase
    .from("tarefa_quadros")
    .select("*, tarefa_quadro_membros(user_id), tarefa_cards(id, arquivado)")
    .eq("arquivado", arquivado)
    .order("posicao", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((q: any) => ({
    id: q.id,
    nome: q.nome,
    descricao: q.descricao,
    fundo_tipo: q.fundo_tipo,
    fundo_cor1: q.fundo_cor1,
    fundo_cor2: q.fundo_cor2,
    posicao: q.posicao,
    arquivado: q.arquivado,
    membros: (q.tarefa_quadro_membros ?? []).map((m: { user_id: string }) => m.user_id),
    cards_total: (q.tarefa_cards ?? []).filter((c: { arquivado: boolean }) => !c.arquivado).length,
  }));
}

export const quadrosQueryOptions = queryOptions({
  queryKey: ["tarefas", "quadros"],
  queryFn: () => fetchQuadros(false),
});

export const quadrosArquivadosQueryOptions = queryOptions({
  queryKey: ["tarefas", "quadros", "arquivados"],
  queryFn: () => fetchQuadros(true),
});

export type QuadroCompleto = { quadro: Quadro; colunas: Coluna[]; cards: Card[] };

export const quadroQueryOptions = (quadroId: string) =>
  queryOptions({
    queryKey: ["tarefas", "quadro", quadroId],
    queryFn: async (): Promise<QuadroCompleto | null> => {
      const { data: q, error } = await supabase
        .from("tarefa_quadros")
        .select("*, tarefa_quadro_membros(user_id)")
        .eq("id", quadroId)
        .maybeSingle();
      if (error) throw error;
      if (!q) return null;
      const [{ data: cols, error: e1 }, { data: cards, error: e2 }] = await Promise.all([
        supabase
          .from("tarefa_colunas")
          .select("*")
          .eq("quadro_id", quadroId)
          .eq("arquivado", false)
          .order("posicao", { ascending: true }),
        supabase
          .from("tarefa_cards")
          .select(CARD_SELECT)
          .eq("quadro_id", quadroId)
          .eq("arquivado", false)
          .order("posicao", { ascending: true }),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      return {
        quadro: {
          id: q.id,
          nome: q.nome,
          descricao: q.descricao,
          fundo_tipo: q.fundo_tipo as FundoTipo,
          fundo_cor1: q.fundo_cor1,
          fundo_cor2: q.fundo_cor2,
          posicao: q.posicao,
          arquivado: q.arquivado,
          membros: (q.tarefa_quadro_membros ?? []).map((m: { user_id: string }) => m.user_id),
        },
        colunas: (cols ?? []) as Coluna[],
        cards: (cards ?? []).map(mapCard),
      };
    },
  });

export async function createQuadro(
  nome: string,
  extra?: { descricao?: string; fundo_tipo?: FundoTipo; fundo_cor1?: string; fundo_cor2?: string },
): Promise<string> {
  const { count } = await supabase
    .from("tarefa_quadros")
    .select("id", { count: "exact", head: true });
  const { data, error } = await supabase
    .from("tarefa_quadros")
    .insert({
      nome: nome.trim() || "Novo quadro",
      posicao: count ?? 0,
      criado_por: await uid(),
      ...extra,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateQuadro(
  id: string,
  values: Partial<Pick<Quadro, "nome" | "descricao" | "fundo_tipo" | "fundo_cor1" | "fundo_cor2">>,
): Promise<void> {
  const { error } = await supabase.from("tarefa_quadros").update(values).eq("id", id);
  if (error) throw error;
}

export async function setMembrosQuadro(quadroId: string, userIds: string[]): Promise<void> {
  const { error: e1 } = await supabase
    .from("tarefa_quadro_membros")
    .delete()
    .eq("quadro_id", quadroId);
  if (e1) throw e1;
  if (userIds.length === 0) return;
  const { error } = await supabase
    .from("tarefa_quadro_membros")
    .insert(userIds.map((user_id) => ({ quadro_id: quadroId, user_id })));
  if (error) throw error;
}

export async function arquivarQuadro(id: string, arquivado: boolean): Promise<void> {
  const { error } = await supabase.from("tarefa_quadros").update({ arquivado }).eq("id", id);
  if (error) throw error;
}

/** Exclusão real. Só depois de digitar o nome do quadro. */
export async function deleteQuadro(id: string): Promise<void> {
  const { error } = await supabase.from("tarefa_quadros").delete().eq("id", id);
  if (error) throw error;
}

// ---------------- colunas ----------------

export async function createColuna(quadroId: string, nome: string): Promise<void> {
  const { data } = await supabase
    .from("tarefa_colunas")
    .select("posicao")
    .eq("quadro_id", quadroId)
    .order("posicao", { ascending: false })
    .limit(1);
  const pos = (data?.[0]?.posicao ?? -1) + 1;
  const { error } = await supabase
    .from("tarefa_colunas")
    .insert({ quadro_id: quadroId, nome: nome.trim() || "Nova coluna", posicao: pos });
  if (error) throw error;
}

export async function updateColuna(
  id: string,
  values: Partial<Pick<Coluna, "nome" | "conclui" | "limite_wip">>,
): Promise<void> {
  const { error } = await supabase.from("tarefa_colunas").update(values).eq("id", id);
  if (error) throw error;
}

export async function reorderColunas(_quadroId: string, idsNaOrdem: string[]): Promise<void> {
  await Promise.all(
    idsNaOrdem.map((id, i) =>
      supabase.from("tarefa_colunas").update({ posicao: i }).eq("id", id),
    ),
  );
}

export async function arquivarColuna(id: string, arquivado: boolean): Promise<void> {
  if (arquivado) {
    const { data: col } = await supabase
      .from("tarefa_colunas")
      .select("quadro_id")
      .eq("id", id)
      .single();
    if (col) {
      const { data: cards } = await supabase
        .from("tarefa_cards")
        .select("id")
        .eq("coluna_id", id);
      if (cards && cards.length > 0) {
        const { data: destino } = await supabase
          .from("tarefa_colunas")
          .select("id")
          .eq("quadro_id", col.quadro_id)
          .eq("arquivado", false)
          .neq("id", id)
          .order("posicao", { ascending: true })
          .limit(1);
        const alvo = destino?.[0]?.id;
        if (!alvo) throw new Error("Crie outra coluna antes de arquivar esta, ela ainda tem cards");
        const { data: ult } = await supabase
          .from("tarefa_cards")
          .select("posicao")
          .eq("coluna_id", alvo)
          .order("posicao", { ascending: false })
          .limit(1);
        let pos = (ult?.[0]?.posicao ?? -1) + 1;
        for (const c of cards) {
          const { error } = await supabase
            .from("tarefa_cards")
            .update({ coluna_id: alvo, posicao: pos++ })
            .eq("id", c.id);
          if (error) throw error;
        }
      }
    }
  }
  const { error } = await supabase.from("tarefa_colunas").update({ arquivado }).eq("id", id);
  if (error) throw error;
}

// ---------------- cards ----------------

export async function createCard(quadroId: string, colunaId: string, titulo: string): Promise<void> {
  const { data } = await supabase
    .from("tarefa_cards")
    .select("posicao")
    .eq("coluna_id", colunaId)
    .order("posicao", { ascending: false })
    .limit(1);
  const { error } = await supabase.from("tarefa_cards").insert({
    quadro_id: quadroId,
    coluna_id: colunaId,
    titulo: titulo.trim(),
    posicao: (data?.[0]?.posicao ?? -1) + 1,
    criado_por: await uid(),
  });
  if (error) throw error;
}

export type CardUpdate = Partial<
  Pick<
    Card,
    | "titulo"
    | "descricao"
    | "responsavel_id"
    | "data_inicio"
    | "data_entrega"
    | "prioridade"
    | "esforco"
    | "adiado_ate"
    | "depende_de"
    | "link_externo"
    | "coluna_id"
    | "quadro_id"
    | "posicao"
    | "concluido"
  >
>;

export async function updateCard(id: string, values: CardUpdate): Promise<void> {
  const { error } = await supabase.from("tarefa_cards").update(values).eq("id", id);
  if (error) throw error;
}

export async function moverCard(
  cardId: string,
  colunaDestinoId: string,
  novaPosicao: number,
): Promise<void> {
  const { data: irmaos } = await supabase
    .from("tarefa_cards")
    .select("id")
    .eq("coluna_id", colunaDestinoId)
    .eq("arquivado", false)
    .neq("id", cardId)
    .order("posicao", { ascending: true });
  const ids = (irmaos ?? []).map((c) => c.id);
  ids.splice(Math.max(0, Math.min(novaPosicao, ids.length)), 0, cardId);
  const { error } = await supabase
    .from("tarefa_cards")
    .update({ coluna_id: colunaDestinoId, posicao: ids.indexOf(cardId) })
    .eq("id", cardId);
  if (error) throw error;
  await reorderCards(colunaDestinoId, ids);
}

export async function reorderCards(_colunaId: string, idsNaOrdem: string[]): Promise<void> {
  await Promise.all(
    idsNaOrdem.map((id, i) => supabase.from("tarefa_cards").update({ posicao: i }).eq("id", id)),
  );
}

export async function arquivarCard(id: string, arquivado: boolean): Promise<void> {
  const { error } = await supabase.from("tarefa_cards").update({ arquivado }).eq("id", id);
  if (error) throw error;
  await registrarHistorico(id, arquivado ? "Arquivou" : "Desarquivou", "");
}

/** Exclusão real, só admin, depois de digitar o título. */
export async function deleteCard(id: string): Promise<void> {
  const { error } = await supabase.from("tarefa_cards").delete().eq("id", id);
  if (error) throw error;
}

export async function setEtiquetasDoCard(cardId: string, etiquetaIds: string[]): Promise<void> {
  const { error: e1 } = await supabase.from("tarefa_card_etiquetas").delete().eq("card_id", cardId);
  if (e1) throw e1;
  if (etiquetaIds.length === 0) return;
  const { error } = await supabase
    .from("tarefa_card_etiquetas")
    .insert(etiquetaIds.map((etiqueta_id) => ({ card_id: cardId, etiqueta_id })));
  if (error) throw error;
}

// ---------------- etiquetas ----------------

export const etiquetasQueryOptions = queryOptions({
  queryKey: ["tarefas", "etiquetas"],
  queryFn: async (): Promise<Etiqueta[]> => {
    const { data, error } = await supabase
      .from("tarefa_etiquetas")
      .select("id, nome, cor, arquivado")
      .eq("arquivado", false)
      .order("nome", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});

export async function createEtiqueta(nome: string, cor: string): Promise<void> {
  const { error } = await supabase
    .from("tarefa_etiquetas")
    .insert({ nome: nome.trim(), cor: cor.toLowerCase() });
  if (error) throw error;
}

export async function updateEtiqueta(
  id: string,
  values: Partial<Pick<Etiqueta, "nome" | "cor">>,
): Promise<void> {
  const { error } = await supabase.from("tarefa_etiquetas").update(values).eq("id", id);
  if (error) throw error;
}

export async function arquivarEtiqueta(id: string, arquivado: boolean): Promise<void> {
  const { error } = await supabase.from("tarefa_etiquetas").update({ arquivado }).eq("id", id);
  if (error) throw error;
}

// ---------------- checklist ----------------

export type ItemChecklist = { id: string; texto: string; feito: boolean; posicao: number };

export const checklistQueryOptions = (cardId: string) =>
  queryOptions({
    queryKey: ["tarefas", "checklist", cardId],
    queryFn: async (): Promise<ItemChecklist[]> => {
      const { data, error } = await supabase
        .from("tarefa_checklist")
        .select("id, texto, feito, posicao")
        .eq("card_id", cardId)
        .order("posicao", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export async function addItemChecklist(cardId: string, texto: string): Promise<void> {
  const { count } = await supabase
    .from("tarefa_checklist")
    .select("id", { count: "exact", head: true })
    .eq("card_id", cardId);
  const { error } = await supabase
    .from("tarefa_checklist")
    .insert({ card_id: cardId, texto: texto.trim(), posicao: count ?? 0 });
  if (error) throw error;
}

export async function toggleItemChecklist(id: string, feito: boolean): Promise<void> {
  const { error } = await supabase.from("tarefa_checklist").update({ feito }).eq("id", id);
  if (error) throw error;
}

export async function updateItemChecklist(id: string, texto: string): Promise<void> {
  const { error } = await supabase.from("tarefa_checklist").update({ texto }).eq("id", id);
  if (error) throw error;
}

export async function deleteItemChecklist(id: string): Promise<void> {
  const { error } = await supabase.from("tarefa_checklist").delete().eq("id", id);
  if (error) throw error;
}

// ---------------- comentários ----------------

export type Comentario = { id: string; texto: string; autor_id: string | null; created_at: string };

export const comentariosQueryOptions = (cardId: string) =>
  queryOptions({
    queryKey: ["tarefas", "comentarios", cardId],
    queryFn: async (): Promise<Comentario[]> => {
      const { data, error } = await supabase
        .from("tarefa_comentarios")
        .select("id, texto, autor_id, created_at")
        .eq("card_id", cardId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export async function addComentario(cardId: string, texto: string): Promise<void> {
  const { error } = await supabase
    .from("tarefa_comentarios")
    .insert({ card_id: cardId, texto: texto.trim(), autor_id: await uid() });
  if (error) throw error;
}

export async function deleteComentario(id: string): Promise<void> {
  const { error } = await supabase.from("tarefa_comentarios").delete().eq("id", id);
  if (error) throw error;
}

// ---------------- anexos ----------------

export type Anexo = {
  id: string;
  nome: string;
  path: string;
  tamanho: number;
  tipo: string;
  created_at: string;
};

export const anexosQueryOptions = (cardId: string) =>
  queryOptions({
    queryKey: ["tarefas", "anexos", cardId],
    queryFn: async (): Promise<Anexo[]> => {
      const { data, error } = await supabase
        .from("tarefa_anexos")
        .select("id, nome, path, tamanho, tipo, created_at")
        .eq("card_id", cardId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

function sanitizarNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(0, 120);
}

export async function uploadAnexo(cardId: string, file: File): Promise<void> {
  const path = `${cardId}/${crypto.randomUUID()}-${sanitizarNome(file.name)}`;
  const { error: upErr } = await supabase.storage
    .from("tarefas")
    .upload(path, file, file.type ? { contentType: file.type } : {});
  if (upErr) throw upErr;
  const { error } = await supabase.from("tarefa_anexos").insert({
    card_id: cardId,
    nome: file.name,
    path,
    tamanho: file.size,
    tipo: file.type,
    enviado_por: await uid(),
  });
  if (error) throw error;
}

export async function urlAnexo(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from("tarefas").createSignedUrl(path, 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteAnexo(id: string, path: string): Promise<void> {
  await supabase.storage.from("tarefas").remove([path]);
  const { error } = await supabase.from("tarefa_anexos").delete().eq("id", id);
  if (error) throw error;
}

// ---------------- histórico ----------------

export type LinhaHistorico = {
  id: string;
  acao: string;
  detalhe: string;
  autor_id: string | null;
  created_at: string;
};

export const historicoQueryOptions = (cardId: string) =>
  queryOptions({
    queryKey: ["tarefas", "historico", cardId],
    queryFn: async (): Promise<LinhaHistorico[]> => {
      const { data, error } = await supabase
        .from("tarefa_historico")
        .select("id, acao, detalhe, autor_id, created_at")
        .eq("card_id", cardId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export async function registrarHistorico(
  cardId: string,
  acao: string,
  detalhe: string,
): Promise<void> {
  await supabase
    .from("tarefa_historico")
    .insert({ card_id: cardId, acao, detalhe, autor_id: await uid() });
}

// ---------------- visões transversais ----------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapComContexto(c: any): CardComContexto {
  return {
    ...mapCard(c),
    quadro_nome: c.tarefa_quadros?.nome ?? "",
    coluna_nome: c.tarefa_colunas?.nome ?? "",
  };
}

const CTX_SELECT = `${CARD_SELECT}, tarefa_quadros(nome, arquivado), tarefa_colunas(nome)`;

export const meusCardsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["tarefas", "meus", userId],
    queryFn: async (): Promise<CardComContexto[]> => {
      const { data, error } = await supabase
        .from("tarefa_cards")
        .select(CTX_SELECT)
        .eq("responsavel_id", userId)
        .eq("arquivado", false)
        .order("data_entrega", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((c: any) => !c.tarefa_quadros?.arquivado)
        .map(mapComContexto);
    },
    enabled: !!userId,
  });

export const cardsDoMesQueryOptions = (ano: number, mes: number) =>
  queryOptions({
    queryKey: ["tarefas", "mes", ano, mes],
    queryFn: async (): Promise<CardComContexto[]> => {
      const ini = `${ano}-${String(mes + 1).padStart(2, "0")}-01`;
      const fimD = new Date(ano, mes + 1, 0);
      const fim = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(fimD.getDate()).padStart(2, "0")}`;
      const { data, error } = await supabase
        .from("tarefa_cards")
        .select(CTX_SELECT)
        .eq("arquivado", false)
        .gte("data_entrega", ini)
        .lte("data_entrega", fim)
        .order("data_entrega", { ascending: true });
      if (error) throw error;
      return (data ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((c: any) => !c.tarefa_quadros?.arquivado)
        .map(mapComContexto);
    },
  });

// ---------------- funções puras ----------------

function hojeIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isoDe(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function diasParado(colunaDesde: string): number {
  return Math.floor((Date.now() - new Date(colunaDesde).getTime()) / 86_400_000);
}

export function estaAtrasado(card: Pick<Card, "data_entrega" | "concluido">): boolean {
  return !!card.data_entrega && !card.concluido && card.data_entrega < hojeIso();
}

export function venceHoje(card: Pick<Card, "data_entrega" | "concluido">): boolean {
  return !!card.data_entrega && !card.concluido && card.data_entrega === hojeIso();
}

export function venceAmanha(card: Pick<Card, "data_entrega" | "concluido">): boolean {
  const a = new Date();
  a.setDate(a.getDate() + 1);
  return !!card.data_entrega && !card.concluido && card.data_entrega === isoDe(a);
}

export function estaAdiado(card: Pick<Card, "adiado_ate">): boolean {
  return !!card.adiado_ate && card.adiado_ate > hojeIso();
}

export function fundoCss(q: Pick<Quadro, "fundo_tipo" | "fundo_cor1" | "fundo_cor2">): string {
  return q.fundo_tipo === "degrade"
    ? `linear-gradient(to bottom, ${q.fundo_cor1}, ${q.fundo_cor2})`
    : q.fundo_cor1;
}

export function formatarData(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}${y && y !== String(new Date().getFullYear()) ? `/${y.slice(2)}` : ""}`;
}

export function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
