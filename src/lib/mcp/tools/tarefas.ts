import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, resposta, falha, linkCard } from "../supabase";

const SEL = "id, titulo, quadro_id, data_entrega, hora_entrega, prioridade, esforco, concluido, arquivado, recorrencia, coluna_desde, responsavel_id, quadro:tarefa_quadros!tarefa_cards_quadro_id_fkey(nome), coluna:tarefa_colunas!tarefa_cards_coluna_id_fkey(nome), etiquetas:tarefa_card_etiquetas(etiqueta:tarefa_etiquetas(nome)), membros:tarefa_card_membros(user_id), comentarios:tarefa_comentarios(count)";

export default defineTool({
  name: "tarefas_listar",
  title: "Listar tarefas",
  description: "Lista cards dos quadros que você pode ver, com filtros por responsável, quadro, situação, datas, prioridade, etiqueta e busca.",
  inputSchema: {
    responsavel: z.string().optional().describe("Nome ou parte do nome; 'eu' = você."),
    quadro: z.string().optional().describe("Nome ou id do quadro."),
    situacao: z.enum(["abertos", "concluidos", "atrasados", "sem_data", "parados", "todos"]).optional(),
    de: z.string().optional().describe("Data de entrega inicial AAAA-MM-DD."),
    ate: z.string().optional().describe("Data de entrega final AAAA-MM-DD."),
    prioridade: z.string().optional(),
    etiqueta: z.string().optional(),
    busca: z.string().optional().describe("Texto no título ou descrição."),
    incluir_arquivados: z.boolean().optional(),
    limite: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (a, ctx) => {
    const sb = supabaseForUser(ctx);
    const { data: pessoas } = await sb.from("profiles").select("id, nome");
    const nome = new Map((pessoas ?? []).map((p) => [p.id, p.nome]));
    let q = sb.from("tarefa_cards").select(SEL).order("data_entrega", { ascending: true, nullsFirst: false }).limit(a.limite ?? 50);
    if (!a.incluir_arquivados) q = q.eq("arquivado", false);
    if (a.responsavel) {
      const ids = a.responsavel.toLowerCase() === "eu" ? [ctx.getUserId()!] :
        (pessoas ?? []).filter((p) => (p.nome ?? "").toLowerCase().includes(a.responsavel!.toLowerCase())).map((p) => p.id);
      if (!ids.length) return falha("Nenhuma pessoa encontrada com esse nome.");
      q = q.in("responsavel_id", ids);
    }
    if (a.quadro) {
      const { data: qs } = await sb.from("tarefa_quadros").select("id, nome").eq("arquivado", false);
      const alvo = (qs ?? []).filter((x) => x.id === a.quadro || x.nome.toLowerCase().includes(a.quadro!.toLowerCase()));
      if (!alvo.length) return falha("Quadro não encontrado.");
      q = q.in("quadro_id", alvo.map((x) => x.id));
    }
    const hoje = new Date().toISOString().slice(0, 10);
    const s = a.situacao ?? "abertos";
    if (s === "abertos") q = q.eq("concluido", false);
    if (s === "concluidos") q = q.eq("concluido", true);
    if (s === "atrasados") q = q.eq("concluido", false).lte("data_entrega", hoje);
    if (s === "sem_data") q = q.is("data_entrega", null);
    if (s === "parados") q = q.eq("concluido", false).lt("coluna_desde", new Date(Date.now() - 5 * 864e5).toISOString());
    if (a.de) q = q.gte("data_entrega", a.de);
    if (a.ate) q = q.lte("data_entrega", a.ate);
    if (a.prioridade) q = q.eq("prioridade", a.prioridade);
    if (a.busca) { const b = a.busca.replace(/[%,()]/g, " "); q = q.or(`titulo.ilike.%${b}%,descricao.ilike.%${b}%`); }
    const { data, error } = await q;
    if (error) return falha(error.message);
    const agora = new Date();
    let cards = (data ?? []).map((c: any) => ({
      id: c.id, titulo: c.titulo, quadro: c.quadro?.nome, coluna: c.coluna?.nome,
      responsavel: c.responsavel_id ? nome.get(c.responsavel_id) ?? null : null,
      membros: (c.membros ?? []).map((m: any) => nome.get(m.user_id)).filter(Boolean),
      data_entrega: c.data_entrega, hora_entrega: c.hora_entrega, prioridade: c.prioridade, esforco: c.esforco,
      etiquetas: (c.etiquetas ?? []).map((e: any) => e.etiqueta?.nome).filter(Boolean),
      recorrente: !!c.recorrencia, comentarios: c.comentarios?.[0]?.count ?? 0, concluido: c.concluido,
      link: linkCard(c.quadro_id, c.id),
    }));
    if (s === "atrasados") cards = cards.filter((c) => new Date(`${c.data_entrega}T${c.hora_entrega ?? "23:59:59"}-03:00`) < agora);
    if (a.etiqueta) cards = cards.filter((c) => c.etiquetas.some((e: string) => e.toLowerCase().includes(a.etiqueta!.toLowerCase())));
    return resposta({ total: cards.length, cards });
  },
});
