import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, resposta, falha, linkCard } from "../supabase";
import { detalheCard } from "../detalhe";

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
    return resposta(await detalheCard(sb, achados[0]!.id));
  },
});
