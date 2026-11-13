import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, falha, resposta } from "../supabase";
import { detalheCard } from "../detalhe";
import {
  PRIORIDADE, DATA, Erro, exigirEdicao, acharResponsavel, acharEtiquetas, acharMembros, acharCard,
  prepararChecklist, registrarHistorico, resolverDependencias, gravarDependencias,
} from "../escrita";

const HORA = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Use HH:MM.");
const REF = z.union([z.string(), z.number().int().min(1)]);
const RECORRENCIA = z.enum(["nunca", "diario", "dias_uteis", "semanal", "mensal_dia", "mensal_semana"]);
const ESFORCO = z.enum(["rapido", "meio_dia", "varios_dias"]);

export default defineTool({
  name: "card_editar",
  title: "Editar card",
  description: "Edita qualquer campo de um card (id ou título exato): textos, pessoas, datas, horas, prioridade, esforço, link, recorrência, etiquetas, membros, checklist e dependências. Tudo é validado antes de gravar. Não muda quadro/coluna (use card_mover) e não apaga card (use card_arquivar).",
  inputSchema: {
    card: z.string().min(1).describe("Id ou título exato do card."),
    titulo: z.string().trim().min(1).max(500).optional(),
    descricao: z.string().max(20000).optional(),
    responsavel: z.string().nullable().optional().describe("Nome ou id existente; null remove."),
    data_inicio: DATA.nullable().optional().describe("AAAA-MM-DD; null remove."),
    hora_inicio: HORA.nullable().optional().describe("HH:MM; null remove."),
    data_entrega: DATA.nullable().optional().describe("AAAA-MM-DD; null remove."),
    hora_entrega: HORA.nullable().optional().describe("HH:MM; null remove."),
    prioridade: PRIORIDADE.nullable().optional(),
    esforco: ESFORCO.nullable().optional(),
    link_externo: z.string().max(2000).optional().describe("Texto vazio remove."),
    recorrencia: RECORRENCIA.optional(),
    etiquetas: z.array(z.string()).optional().describe("Lista final de etiquetas existentes (substitui as atuais)."),
    membros: z.array(z.string()).optional().describe("Lista final de pessoas existentes (substitui a atual)."),
    adicionar_checklist: z.array(z.string()).optional().describe("Textos adicionados ao fim."),
    editar_checklist: z.array(z.object({
      item: REF.describe("Id ou posição (1 = primeiro)."),
      texto: z.string().max(2000).optional().describe("Novo texto; vazio apaga."),
      feito: z.boolean().optional(),
    })).optional(),
    remover_checklist: z.array(REF).optional().describe("Ids ou posições dos itens a apagar."),
    marcar_checklist: z.array(z.object({ item: REF, feito: z.boolean() })).optional(),
    reordenar_checklist: z.array(REF).optional().describe("Lista final de ids (todos os itens restantes) na ordem desejada."),
    ordem_checklist: z.array(REF).optional().describe("Mesmo que reordenar_checklist."),
    substituir_checklist: z.array(z.string()).optional().describe("Lista final de textos; troca o checklist inteiro."),
    depende_de: z.array(z.string()).optional().describe("Ids ou títulos exatos de cards dos quais este passa a depender."),
    remover_dependencia: z.array(z.string()).optional().describe("Ids ou títulos exatos de cards dos quais este deixa de depender."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  handler: async (a, ctx) => {
    if (!ctx.isAuthenticated()) return falha("Não autenticado.");
    const sb = supabaseForUser(ctx);
    try {
      const c = await acharCard(sb, a.card);
      await exigirEdicao(sb, c.quadro_id);

      // 1) Validar e resolver tudo antes de gravar qualquer coisa.
      const mud: Record<string, unknown> = {};
      const desc: string[] = [];
      const campo = (k: string, v: unknown, rotulo: string) => { if (v !== undefined) { mud[k] = v; desc.push(rotulo); } };
      campo("titulo", a.titulo, "título");
      campo("descricao", a.descricao, "descrição");
      if (a.responsavel !== undefined) campo("responsavel_id", a.responsavel === null ? null : await acharResponsavel(sb, a.responsavel), "responsável");
      campo("data_inicio", a.data_inicio, "data de início");
      campo("hora_inicio", a.hora_inicio, "hora de início");
      campo("data_entrega", a.data_entrega, "entrega");
      campo("hora_entrega", a.hora_entrega, "hora de entrega");
      campo("prioridade", a.prioridade, "prioridade");
      campo("esforco", a.esforco, "esforço");
      campo("link_externo", a.link_externo?.trim(), "link externo");
      campo("recorrencia", a.recorrencia, "recorrência");
      const etiquetaIds = a.etiquetas ? await acharEtiquetas(sb, c.quadro_id, a.etiquetas) : null;
      const membroIds = a.membros ? await acharMembros(sb, a.membros) : null;
      const ck = await prepararChecklist(sb, c.id, {
        adicionar: a.adicionar_checklist, editar: a.editar_checklist, remover: a.remover_checklist,
        marcar: a.marcar_checklist, ordem: a.reordenar_checklist ?? a.ordem_checklist, substituir: a.substituir_checklist,
      });
      const novasDeps = a.depende_de?.length ? await resolverDependencias(sb, c.id, a.depende_de) : [];
      let tirarDeps: { id: string; titulo: string }[] = [];
      if (a.remover_dependencia?.length) {
        tirarDeps = await resolverDependencias(sb, c.id, a.remover_dependencia);
        const { data: atuais } = await sb.from("tarefa_card_dependencias").select("depende_de_id").eq("card_id", c.id);
        const tem = new Set((atuais ?? []).map((x) => x.depende_de_id));
        const nao = tirarDeps.filter((d) => !tem.has(d.id));
        if (nao.length) throw new Erro(`Este card não depende de: ${nao.map((d) => d.titulo).join(", ")}.`);
      }
      if (etiquetaIds) desc.push("etiquetas");
      if (membroIds) desc.push("membros");
      desc.push(...ck.desc);
      if (novasDeps.length) desc.push(`dependências adicionadas (${novasDeps.map((d) => d.titulo).join(", ")})`);
      if (tirarDeps.length) desc.push(`dependências removidas (${tirarDeps.map((d) => d.titulo).join(", ")})`);
      if (!desc.length) throw new Erro("Nada para alterar.");

      // 2) Gravar.
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
      }
      if (membroIds) {
        const { data: atuais } = await sb.from("tarefa_card_membros").select("user_id").eq("card_id", c.id);
        const tem = new Set((atuais ?? []).map((x) => x.user_id));
        const sair = [...tem].filter((id) => !membroIds.includes(id));
        const entrar = membroIds.filter((id) => !tem.has(id));
        if (sair.length) { const { error } = await sb.from("tarefa_card_membros").delete().eq("card_id", c.id).in("user_id", sair); if (error) throw new Erro(`Membros: ${error.message}`); }
        if (entrar.length) { const { error } = await sb.from("tarefa_card_membros").upsert(entrar.map((user_id) => ({ card_id: c.id, user_id })), { ignoreDuplicates: true }); if (error) throw new Erro(`Membros: ${error.message}`); }
      }
      await ck.gravar();
      await gravarDependencias(sb, c.id, novasDeps, ctx);
      if (tirarDeps.length) {
        const { error } = await sb.from("tarefa_card_dependencias").delete().eq("card_id", c.id).in("depende_de_id", tirarDeps.map((d) => d.id));
        if (error) throw new Erro(`Dependências: ${error.message}`);
      }
      await registrarHistorico(sb, ctx, c.id, "editou", `Alterou: ${desc.join("; ")}.`);
      return resposta({ atualizado: desc, card: await detalheCard(sb, c.id) });
    } catch (e) {
      return falha(e instanceof Error ? e.message : "Erro ao editar card.");
    }
  },
});
