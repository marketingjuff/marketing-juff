import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, falha, resposta, linkCard } from "../supabase";
import { UUID, Erro, exigirEdicao, acharQuadro, acharColuna, idsDaColuna, gravarOrdemColuna, registrarHistorico } from "../escrita";

export default defineTool({
  name: "card_ordenar_coluna",
  title: "Ordenar coluna",
  description: "Define a ordem dos cards de uma coluna; os que não forem listados vão para o fim, na ordem que já tinham.",
  inputSchema: {
    quadro: z.string().min(1).describe("Nome ou id do quadro."),
    coluna: z.string().min(1).describe("Nome ou id da coluna."),
    cards: z.array(z.string().min(1)).min(1).describe("Ids ou títulos exatos, na ordem final."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (a, ctx) => {
    if (!ctx.isAuthenticated()) return falha("Não autenticado.");
    const sb = supabaseForUser(ctx);
    try {
      const quadro = await acharQuadro(sb, a.quadro);
      await exigirEdicao(sb, quadro.id);
      const col = await acharColuna(sb, quadro, a.coluna);
      const atuais = await idsDaColuna(sb, col.id);
      const escolhidos: string[] = [];
      for (const r of a.cards.map((x) => x.trim())) {
        const achados = atuais.filter((x) => (UUID.test(r) ? x.id === r : x.titulo === r));
        if (!achados.length) throw new Erro(`Card "${r}" não está na coluna ${col.nome}.`);
        if (achados.length > 1) throw new Erro(`Vários cards "${r}" nessa coluna; use o id: ${achados.map((x) => x.id).join(", ")}.`);
        if (escolhidos.includes(achados[0]!.id)) throw new Erro(`Card "${r}" repetido na lista.`);
        escolhidos.push(achados[0]!.id);
      }
      const ordem = [...escolhidos, ...atuais.map((x) => x.id).filter((id) => !escolhidos.includes(id))];
      await gravarOrdemColuna(sb, col.id, ordem);
      const titulo = new Map(atuais.map((x) => [x.id, x.titulo]));
      for (const [i, id] of ordem.entries()) {
        const antes = atuais.findIndex((x) => x.id === id);
        if (antes !== i) await registrarHistorico(sb, ctx, id, "moveu", `Reordenou a coluna ${col.nome}: posição ${antes + 1} → ${i + 1}.`);
      }
      return resposta({ quadro: quadro.nome, coluna: col.nome, ordem: ordem.map((id, i) => ({ posicao: i + 1, id, titulo: titulo.get(id), link: linkCard(quadro.id, id) })) });
    } catch (e) {
      return falha(e instanceof Error ? e.message : "Erro ao ordenar coluna.");
    }
  },
});
