import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, resposta, falha } from "../supabase";

export default defineTool({
  name: "quadros_panorama",
  title: "Panorama dos quadros",
  description: "Por quadro: colunas com contagem, atrasados, parados, sem responsável e divisão por responsável.",
  inputSchema: { quadro: z.string().optional().describe("Nome ou id do quadro.") },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ quadro }, ctx) => {
    const sb = supabaseForUser(ctx);
    const [{ data: qs, error }, { data: cols }, { data: cards }, { data: pessoas }] = await Promise.all([
      sb.from("tarefa_quadros").select("id, nome").eq("arquivado", false).order("posicao"),
      sb.from("tarefa_colunas").select("id, nome, posicao, quadro_id").eq("arquivado", false).order("posicao"),
      sb.from("tarefa_cards").select("quadro_id, coluna_id, responsavel_id, concluido, data_entrega, coluna_desde").eq("arquivado", false).limit(5000),
      sb.from("profiles").select("id, nome"),
    ]);
    if (error) return falha(error.message);
    const n = new Map((pessoas ?? []).map((p) => [p.id, p.nome]));
    const hoje = new Date().toISOString().slice(0, 10);
    const limiteParado = Date.now() - 5 * 864e5;
    const alvo = (qs ?? []).filter((q) => !quadro || q.id === quadro || q.nome.toLowerCase().includes(quadro.toLowerCase()));
    return resposta(alvo.map((q) => {
      const cs = (cards ?? []).filter((c) => c.quadro_id === q.id);
      const abertos = cs.filter((c) => !c.concluido);
      const porResp: Record<string, number> = {};
      for (const c of abertos) { const k = c.responsavel_id ? n.get(c.responsavel_id) ?? "?" : "Sem responsável"; porResp[k] = (porResp[k] ?? 0) + 1; }
      return {
        quadro: q.nome, id: q.id,
        colunas: (cols ?? []).filter((c) => c.quadro_id === q.id).map((c) => ({ nome: c.nome, cards: cs.filter((k) => k.coluna_id === c.id).length })),
        atrasados: abertos.filter((c) => c.data_entrega && c.data_entrega < hoje).length,
        parados: abertos.filter((c) => c.coluna_desde && new Date(c.coluna_desde).getTime() < limiteParado).length,
        sem_responsavel: abertos.filter((c) => !c.responsavel_id).length,
        por_responsavel: porResp,
      };
    }));
  },
});
