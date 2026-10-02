import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TipoNotificacao =
  | "card_atribuido"
  | "comentario"
  | "lembrete"
  | "vence_amanha"
  | "atrasado"
  | "parado";

export const TIPOS_NOTIFICACAO: { valor: TipoNotificacao; label: string; descricao: string }[] = [
  { valor: "card_atribuido", label: "Card atribuído a mim", descricao: "Quando outra pessoa coloca seu nome num card." },
  { valor: "comentario", label: "Comentário", descricao: "Comentário num card seu ou que marcou seu nome com arroba." },
  { valor: "lembrete", label: "Lembrete de entrega", descricao: "Na antecedência escolhida dentro do card. Sem hora marcada, à meia noite do dia." },
  { valor: "vence_amanha", label: "Vence amanhã", descricao: "Um dia antes da data de entrega." },
  { valor: "atrasado", label: "Card atrasado", descricao: "Passou da data de entrega e não foi concluído." },
  { valor: "parado", label: "Card parado", descricao: "Cinco dias ou mais na mesma coluna." },
];

export type Notificacao = {
  id: string;
  tipo: TipoNotificacao;
  card_id: string | null;
  quadro_id: string | null;
  titulo: string;
  detalhe: string;
  lida: boolean;
  created_at: string;
};

const PADRAO = { staleTime: 60_000, refetchOnWindowFocus: false } as const;

export const notificacoesQueryOptions = queryOptions({
  queryKey: ["notificacoes", "lista"],
  queryFn: async (): Promise<Notificacao[]> => {
    const { data, error } = await supabase
      .from("notificacoes")
      .select("id, tipo, card_id, quadro_id, titulo, detalhe, lida, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []) as Notificacao[];
  },
  ...PADRAO,
  refetchInterval: 60_000,
});

export async function marcarLida(id: string): Promise<void> {
  const { error } = await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
  if (error) throw error;
}

export async function marcarTodasLidas(): Promise<number> {
  const { data, error } = await supabase.rpc("notificacoes_marcar_todas");
  if (error) throw error;
  return (data as number) ?? 0;
}

export async function apagarNotificacao(id: string): Promise<void> {
  const { error } = await supabase.from("notificacoes").delete().eq("id", id);
  if (error) throw error;
}

// ---------------- preferências ----------------

export type PrefCanais = { sininho: boolean; push: boolean };

const PUSH_PADRAO: TipoNotificacao[] = ["card_atribuido", "comentario"];

export const preferenciasQueryOptions = queryOptions({
  queryKey: ["notificacoes", "preferencias"],
  queryFn: async (): Promise<Record<string, PrefCanais>> => {
    const { data, error } = await supabase
      .from("notificacao_preferencias")
      .select("tipo, ativo, push");
    if (error) throw error;
    const out: Record<string, PrefCanais> = {};
    for (const t of TIPOS_NOTIFICACAO) {
      out[t.valor] = { sininho: true, push: PUSH_PADRAO.includes(t.valor) };
    }
    for (const linha of data ?? []) {
      out[linha.tipo] = { sininho: linha.ativo, push: linha.push ?? false };
    }
    return out;
  },
  ...PADRAO,
});

export async function salvarPreferencia(
  tipo: TipoNotificacao,
  canal: "sininho" | "push",
  valor: boolean,
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("sem sessão");
  const { data: atual } = await supabase
    .from("notificacao_preferencias")
    .select("ativo, push")
    .eq("user_id", uid)
    .eq("tipo", tipo)
    .maybeSingle();
  const linha = {
    user_id: uid,
    tipo,
    ativo: canal === "sininho" ? valor : (atual?.ativo ?? true),
    push: canal === "push" ? valor : (atual?.push ?? PUSH_PADRAO.includes(tipo)),
  };
  const { error } = await supabase
    .from("notificacao_preferencias")
    .upsert(linha, { onConflict: "user_id,tipo" });
  if (error) throw error;
}

/** "agora", "há 2 h", "ontem", "12/03". */
export function quandoFoi(iso: string): string {
  const d = new Date(iso);
  const min = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.floor(h / 24);
  if (dias === 1) return "ontem";
  if (dias < 7) return `há ${dias} dias`;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}
