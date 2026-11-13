import { linkCard } from "./supabase";
type SB = ReturnType<typeof import("./supabase").supabaseForUser>;

/** Card completo no formato da card_detalhe. */
export async function detalheCard(sb: SB, id: string) {
  const [{ data: c }, { data: pessoas }, ck, cm, an, hi, mb, et] = await Promise.all([
    sb.from("tarefa_cards").select("*, quadro:tarefa_quadros!tarefa_cards_quadro_id_fkey(nome), coluna:tarefa_colunas!tarefa_cards_coluna_id_fkey(nome)").eq("id", id).single(),
    sb.from("profiles").select("id, nome"),
    sb.from("tarefa_checklist").select("id, texto, feito, posicao").eq("card_id", id).order("posicao").order("created_at"),
    sb.from("tarefa_comentarios").select("autor_id, texto, created_at").eq("card_id", id).order("created_at"),
    sb.from("tarefa_anexos").select("*").eq("card_id", id),
    sb.from("tarefa_historico").select("*").eq("card_id", id).order("created_at").limit(200),
    sb.from("tarefa_card_membros").select("user_id").eq("card_id", id),
    sb.from("tarefa_card_etiquetas").select("etiqueta:tarefa_etiquetas(nome)").eq("card_id", id),
  ]);
  const n = new Map((pessoas ?? []).map((p) => [p.id, p.nome]));
  const x: any = c;
  return {
    ...x, responsavel: x?.responsavel_id ? n.get(x.responsavel_id) : null, quadro: x?.quadro?.nome, coluna: x?.coluna?.nome,
    checklist: (ck.data ?? []).map((i, k) => ({ id: i.id, posicao: k + 1, texto: i.texto, feito: i.feito })),
    comentarios: (cm.data ?? []).map((k) => ({ autor: n.get(k.autor_id), texto: k.texto, hora: k.created_at })),
    anexos: ((an.data ?? []) as any[]).map((a) => ({ nome: a.nome ?? a.arquivo_nome ?? a.path })),
    historico: hi.data ?? [],
    membros: (mb.data ?? []).map((m) => n.get(m.user_id)),
    etiquetas: (et.data ?? []).map((e: any) => e.etiqueta?.nome),
    link: linkCard(x.quadro_id, id),
  };
}
