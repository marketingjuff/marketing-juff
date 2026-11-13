import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, falha, linkCard } from "../supabase";
import { UUID, PRIORIDADE, DATA, Erro, exigirEdicao, acharResponsavel, acharEtiquetas, adicionarChecklist, registrarHistorico, adicionarDependencias } from "../escrita";

export default defineTool({
  name: "card_criar",
  title: "Criar card",
  description: "Cria um card num quadro e coluna (nome ou id) que você pode editar. Responsável e etiquetas precisam já existir.",
  inputSchema: {
    quadro: z.string().min(1).describe("Nome ou id do quadro."),
    coluna: z.string().min(1).describe("Nome ou id da coluna."),
    titulo: z.string().trim().min(1).max(500),
    descricao: z.string().max(20000).optional(),
    responsavel: z.string().optional().describe("Nome ou id de uma pessoa existente."),
    data_entrega: DATA.optional(),
    prioridade: PRIORIDADE.optional(),
    etiquetas: z.array(z.string()).optional().describe("Nomes de etiquetas existentes."),
    checklist: z.array(z.string()).optional(),
    depende_de: z.array(z.string()).optional().describe("Ids ou títulos exatos dos cards dos quais este depende (adiciona)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (a, ctx) => {
    if (!ctx.isAuthenticated()) return falha("Não autenticado.");
    const sb = supabaseForUser(ctx);
    try {
      const { data: qs } = await (UUID.test(a.quadro) ? sb.from("tarefa_quadros").select("id, nome").eq("id", a.quadro) : sb.from("tarefa_quadros").select("id, nome").ilike("nome", a.quadro.trim())).eq("arquivado", false);
      if (!qs?.length) throw new Erro("Quadro não encontrado ou sem acesso.");
      if (qs.length > 1) throw new Erro("Mais de um quadro com esse nome; use o id.");
      const q = qs[0]!;
      await exigirEdicao(sb, q.id);
      const { data: cols } = await sb.from("tarefa_colunas").select("id, nome").eq("quadro_id", q.id).eq("arquivado", false).order("posicao");
      const col = (cols ?? []).find((c) => c.id === a.coluna || c.nome.trim().toLowerCase() === a.coluna.trim().toLowerCase());
      if (!col) throw new Erro(`Coluna "${a.coluna}" não existe em ${q.nome}. Colunas: ${(cols ?? []).map((c) => c.nome).join(", ")}.`);
      const responsavel_id = a.responsavel ? await acharResponsavel(sb, a.responsavel) : undefined;
      const etiquetaIds = a.etiquetas?.length ? await acharEtiquetas(sb, q.id, a.etiquetas) : [];
      const { data: ult } = await sb.from("tarefa_cards").select("posicao").eq("coluna_id", col.id).order("posicao", { ascending: false }).limit(1);
      const { data: novo, error } = await sb.from("tarefa_cards").insert({
        quadro_id: q.id, coluna_id: col.id, titulo: a.titulo, posicao: (ult?.[0]?.posicao ?? -1) + 1,
        criado_por: ctx.getUserId()!, lembrete_min: 0,
        ...(a.descricao !== undefined ? { descricao: a.descricao } : {}),
        ...(responsavel_id ? { responsavel_id } : {}),
        ...(a.data_entrega ? { data_entrega: a.data_entrega } : {}),
        ...(a.prioridade ? { prioridade: a.prioridade } : {}),
      }).select("id").single();
      if (error || !novo) throw new Erro(error?.message ?? "Não foi possível criar.");
      if (etiquetaIds.length) {
        const { error: e } = await sb.from("tarefa_card_etiquetas").upsert(etiquetaIds.map((etiqueta_id) => ({ card_id: novo.id, etiqueta_id })), { ignoreDuplicates: true });
        if (e) throw new Erro(`Etiquetas: ${e.message}`);
      }
      if (a.checklist?.length) await adicionarChecklist(sb, novo.id, a.checklist);
      const deps = a.depende_de?.length ? await adicionarDependencias(sb, novo.id, a.depende_de, ctx) : [];
      await registrarHistorico(sb, ctx, novo.id, "criou", `Card criado em ${q.nome} / ${col.nome}.${deps.length ? ` Depende de: ${deps.join(", ")}.` : ""}`);
      const link = linkCard(q.id, novo.id);
      return { content: [{ type: "text", text: `Card criado: ${link}` }], structuredContent: { id: novo.id, link } };
    } catch (e) {
      return falha(e instanceof Error ? e.message : "Erro ao criar card.");
    }
  },
});
