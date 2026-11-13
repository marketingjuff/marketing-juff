import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, falha, resposta } from "../supabase";
import { detalheCard } from "../detalhe";
import { Erro, exigirEdicao, acharCard, acharQuadro, acharColuna, idsDaColuna, gravarOrdemColuna, registrarHistorico } from "../escrita";

export default defineTool({
  name: "card_mover",
  title: "Mover card",
  description: "Move um card para outra coluna, posição ou quadro que você pode editar. Coluna de conclusão marca como concluído; sair dela desmarca.",
  inputSchema: {
    card: z.string().min(1).describe("Id ou título exato do card."),
    coluna: z.string().optional().describe("Nome ou id da coluna de destino; vazio mantém a atual."),
    quadro: z.string().optional().describe("Nome ou id do quadro de destino; vazio mantém o atual."),
    posicao: z.number().int().min(1).optional().describe("Posição na coluna de destino (1 = topo); vazio vai para o fim."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (a, ctx) => {
    if (!ctx.isAuthenticated()) return falha("Não autenticado.");
    const sb = supabaseForUser(ctx);
    try {
      const c = await acharCard(sb, a.card);
      if (c.arquivado) throw new Erro("Card arquivado; desarquive antes de mover.");
      await exigirEdicao(sb, c.quadro_id);
      const { data: qAtual } = await sb.from("tarefa_quadros").select("id, nome").eq("id", c.quadro_id).single();
      const quadro = a.quadro?.trim() ? await acharQuadro(sb, a.quadro) : qAtual!;
      if (quadro.id !== c.quadro_id) await exigirEdicao(sb, quadro.id);
      if (quadro.id !== c.quadro_id && !a.coluna?.trim()) throw new Erro("Ao trocar de quadro, informe a coluna de destino.");
      const { data: colOrigem } = await sb.from("tarefa_colunas").select("id, nome").eq("id", c.coluna_id).single();
      const destino = a.coluna?.trim() ? await acharColuna(sb, quadro, a.coluna) : colOrigem!;

      const origemIds = (await idsDaColuna(sb, c.coluna_id)).map((x) => x.id);
      const posOrigem = origemIds.indexOf(c.id) + 1;
      const destIds = destino.id === c.coluna_id ? origemIds.filter((id) => id !== c.id) : (await idsDaColuna(sb, destino.id)).map((x) => x.id);
      const idx = Math.min((a.posicao ?? destIds.length + 1) - 1, destIds.length);
      destIds.splice(idx, 0, c.id);

      if (quadro.id !== c.quadro_id || destino.id !== c.coluna_id) {
        const { data, error } = await sb.from("tarefa_cards").update({ quadro_id: quadro.id, coluna_id: destino.id }).eq("id", c.id).select("id");
        if (error) throw new Erro(error.message);
        if (!data?.length) throw new Erro("Sem permissão para mover este card.");
        await gravarOrdemColuna(sb, c.coluna_id, origemIds.filter((id) => id !== c.id));
      }
      await gravarOrdemColuna(sb, destino.id, destIds);
      const de = `${qAtual!.nome} / ${colOrigem!.nome} (posição ${posOrigem})`;
      const para = `${quadro.nome} / ${destino.nome} (posição ${idx + 1})`;
      await registrarHistorico(sb, ctx, c.id, "moveu", `Moveu de ${de} para ${para}.`);
      return resposta({ movido: { de, para }, card: await detalheCard(sb, c.id) });
    } catch (e) {
      return falha(e instanceof Error ? e.message : "Erro ao mover card.");
    }
  },
});
