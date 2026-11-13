import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, falha, linkCard } from "../supabase";
import { UUID, PRIORIDADE, DATA, Erro, exigirEdicao, acharResponsavel, acharEtiquetas, aplicarChecklist, registrarHistorico, adicionarDependencias } from "../escrita";

export default defineTool({
  name: "card_editar",
  title: "Editar card",
  description: "Altera título, descrição, responsável, entrega, prioridade, etiquetas e checklist (adicionar, editar, remover, marcar, reordenar ou substituir; use ids/posições de card_detalhe) de um card (id ou título exato). Não muda o quadro.",
  inputSchema: {
    card: z.string().min(1).describe("Id ou título exato do card."),
    titulo: z.string().trim().min(1).max(500).optional(),
    descricao: z.string().max(20000).optional(),
    responsavel: z.string().nullable().optional().describe("Nome ou id existente; null remove."),
    data_entrega: DATA.nullable().optional().describe("AAAA-MM-DD; null remove."),
    prioridade: PRIORIDADE.nullable().optional(),
    etiquetas: z.array(z.string()).optional().describe("Lista final de etiquetas existentes (substitui as atuais)."),
    adicionar_checklist: z.array(z.string()).optional().describe("Textos adicionados ao fim."),
    editar_checklist: z.array(z.object({ item: z.union([z.string(), z.number().int().min(1)]).describe("Id ou posição (1 = primeiro)."), texto: z.string().max(2000).describe("Novo texto; vazio apaga.") })).optional(),
    remover_checklist: z.array(z.union([z.string(), z.number().int().min(1)])).optional().describe("Ids ou posições."),
    marcar_checklist: z.array(z.object({ item: z.union([z.string(), z.number().int().min(1)]), feito: z.boolean() })).optional(),
    ordem_checklist: z.array(z.string()).optional().describe("Lista final de ids (todos os itens restantes) na ordem desejada."),
    substituir_checklist: z.array(z.string()).optional().describe("Lista final de textos; troca o checklist inteiro."),
    depende_de: z.array(z.string()).optional().describe("Ids ou títulos exatos dos cards dos quais este depende (adiciona)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (a, ctx) => {
    if (!ctx.isAuthenticated()) return falha("Não autenticado.");
    const sb = supabaseForUser(ctx);
    try {
      const { data: achados } = await (UUID.test(a.card) ? sb.from("tarefa_cards").select("id, quadro_id, titulo").eq("id", a.card) : sb.from("tarefa_cards").select("id, quadro_id, titulo").eq("titulo", a.card)).limit(20);
      if (!achados?.length) throw new Erro("Card não encontrado ou sem acesso.");
      if (achados.length > 1) throw new Erro(`Vários cards com esse título; use o id: ${achados.map((c) => c.id).join(", ")}.`);
      const c = achados[0]!;
      await exigirEdicao(sb, c.quadro_id);
      const mud: Record<string, unknown> = {};
      const desc: string[] = [];
      if (a.titulo !== undefined) { mud["titulo"] = a.titulo; desc.push("título"); }
      if (a.descricao !== undefined) { mud["descricao"] = a.descricao; desc.push("descrição"); }
      if (a.responsavel !== undefined) { mud["responsavel_id"] = a.responsavel === null ? null : await acharResponsavel(sb, a.responsavel); desc.push("responsável"); }
      if (a.data_entrega !== undefined) { mud["data_entrega"] = a.data_entrega; desc.push("entrega"); }
      if (a.prioridade !== undefined) { mud["prioridade"] = a.prioridade; desc.push("prioridade"); }
      const etiquetaIds = a.etiquetas ? await acharEtiquetas(sb, c.quadro_id, a.etiquetas) : null;
      if (Object.keys(mud).length) {
        const { data, error } = await sb.from("tarefa_cards").update(mud).eq("id", c.id).select("id");
        if (error) throw new Erro(error.message);
        if (!data?.length) throw new Erro("Sem permissão para alterar este card.");
      }
      if (etiquetaIds) {
        const { data: atuais } = await sb.from("tarefa_card_etiquetas").select("etiqueta_id").eq("card_id", c.id);
        const tem = new Set((atuais ?? []).map((x) => x.etiqueta_id));
        const sair = [...tem].filter((id) => !etiquetaIds.includes(id));
        const entrar = etiquetaIds.filter((id) => !tem.has(id));
        if (sair.length) { const { error } = await sb.from("tarefa_card_etiquetas").delete().eq("card_id", c.id).in("etiqueta_id", sair); if (error) throw new Erro(error.message); }
        if (entrar.length) { const { error } = await sb.from("tarefa_card_etiquetas").insert(entrar.map((etiqueta_id) => ({ card_id: c.id, etiqueta_id }))); if (error) throw new Erro(error.message); }
        desc.push("etiquetas");
      }
      desc.push(...await aplicarChecklist(sb, c.id, { adicionar: a.adicionar_checklist, editar: a.editar_checklist, remover: a.remover_checklist, marcar: a.marcar_checklist, ordem: a.ordem_checklist, substituir: a.substituir_checklist }));
      if (a.depende_de?.length) { const deps = await adicionarDependencias(sb, c.id, a.depende_de, ctx); desc.push(`dependências (${deps.join(", ")})`); }
      if (!desc.length) throw new Erro("Nada para alterar.");
      await registrarHistorico(sb, ctx, c.id, "editou", `Alterou: ${desc.join(", ")}.`);
      const link = linkCard(c.quadro_id, c.id);
      return { content: [{ type: "text", text: `Card atualizado (${desc.join(", ")}): ${link}` }], structuredContent: { id: c.id, link } };
    } catch (e) {
      return falha(e instanceof Error ? e.message : "Erro ao editar card.");
    }
  },
});
