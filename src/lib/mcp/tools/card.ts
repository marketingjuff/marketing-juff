import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, resposta, falha, linkCard } from "../supabase";

export default defineTool({
  name: "card_detalhe",
  title: "Detalhe do card",
  description: "Traz tudo de um card: descrição, checklist, comentários, anexos, histórico, membros e etiquetas.",
  inputSchema: { card: z.string().min(1).describe("Id ou título exato do card.") },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ card }, ctx) => {
    const sb = supabaseForUser(ctx);
    const uuid = /^[0-9a-f-]{36}$/i.test(card);
    const { data: achados, error } = await (uuid ? sb.from("tarefa_cards").select("id, titulo, quadro_id").eq("id", card) : sb.from("tarefa_cards").select("id, titulo, quadro_id").ilike("titulo", card)).limit(20);
    if (error) return falha(error.message);
    if (!achados?.length) return falha("Card não encontrado ou sem acesso.");
    if (achados.length > 1) return resposta({ varios: achados.map((c) => ({ ...c, link: linkCard(c.quadro_id, c.id) })) });
    const id = achados[0]!.id;
    const [{ data: c }, { data: pessoas }, ck, cm, an, hi, mb, et] = await Promise.all([
      sb.from("tarefa_cards").select("*, quadro:tarefa_quadros!tarefa_cards_quadro_id_fkey(nome), coluna:tarefa_colunas!tarefa_cards_coluna_id_fkey(nome)").eq("id", id).single(),
      sb.from("profiles").select("id, nome"),
      sb.from("tarefa_checklist").select("texto, feito, posicao").eq("card_id", id).order("posicao"),
      sb.from("tarefa_comentarios").select("autor_id, texto, created_at").eq("card_id", id).order("created_at"),
      sb.from("tarefa_anexos").select("*").eq("card_id", id),
      sb.from("tarefa_historico").select("*").eq("card_id", id).order("created_at").limit(200),
      sb.from("tarefa_card_membros").select("user_id").eq("card_id", id),
      sb.from("tarefa_card_etiquetas").select("etiqueta:tarefa_etiquetas(nome)").eq("card_id", id),
    ]);
    const n = new Map((pessoas ?? []).map((p) => [p.id, p.nome]));
    const x: any = c;
    return resposta({
      ...x, responsavel: x?.responsavel_id ? n.get(x.responsavel_id) : null, quadro: x?.quadro?.nome, coluna: x?.coluna?.nome,
      checklist: ck.data ?? [],
      comentarios: (cm.data ?? []).map((k) => ({ autor: n.get(k.autor_id), texto: k.texto, hora: k.created_at })),
      anexos: ((an.data ?? []) as any[]).map((a) => ({ nome: a.nome ?? a.arquivo_nome ?? a.path })),
      historico: hi.data ?? [],
      membros: (mb.data ?? []).map((m) => n.get(m.user_id)),
      etiquetas: (et.data ?? []).map((e: any) => e.etiqueta?.nome),
      link: linkCard(x.quadro_id, id),
    });
  },
});
