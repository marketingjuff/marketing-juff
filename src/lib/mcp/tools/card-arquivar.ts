import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, falha, resposta } from "../supabase";
import { detalheCard } from "../detalhe";
import { Erro, exigirEdicao, acharCard, registrarHistorico } from "../escrita";

export default defineTool({
  name: "card_arquivar",
  title: "Arquivar card",
  description: "Arquiva ou desarquiva um card (nunca apaga). Apagar card não existe no conector; arquivar é o caminho.",
  inputSchema: {
    card: z.string().min(1).describe("Id ou título exato do card."),
    arquivar: z.boolean().optional().describe("true arquiva (padrão), false desarquiva."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (a, ctx) => {
    if (!ctx.isAuthenticated()) return falha("Não autenticado.");
    const sb = supabaseForUser(ctx);
    try {
      const arquivar = a.arquivar ?? true;
      const c = await acharCard(sb, a.card);
      await exigirEdicao(sb, c.quadro_id);
      if (c.arquivado === arquivar) throw new Erro(arquivar ? "O card já está arquivado." : "O card não está arquivado.");
      const { data, error } = await sb.from("tarefa_cards").update({ arquivado: arquivar }).eq("id", c.id).select("id");
      if (error) throw new Erro(error.message);
      if (!data?.length) throw new Erro("Sem permissão para arquivar este card.");
      await registrarHistorico(sb, ctx, c.id, arquivar ? "Arquivou" : "Desarquivou", "");
      return resposta({ arquivado: arquivar, card: await detalheCard(sb, c.id) });
    } catch (e) {
      return falha(e instanceof Error ? e.message : "Erro ao arquivar card.");
    }
  },
});
