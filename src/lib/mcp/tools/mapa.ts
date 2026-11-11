import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, resposta, falha } from "../supabase";

export default defineTool({
  name: "mapa_do_sistema",
  title: "Mapa do sistema",
  description: "Explica os módulos e o vocabulário do Marketing Juff e traz contagens e quadros que você pode ver.",
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (_a, ctx) => {
    const sb = supabaseForUser(ctx);
    const c = async (t: string, f?: (q: any) => any) => {
      let q: any = sb.from(t as any).select("id", { count: "exact", head: true });
      if (f) q = f(q);
      const { count } = await q;
      return count ?? 0;
    };
    const { data: quadros, error } = await sb.from("tarefa_quadros").select("id, nome").eq("arquivado", false).order("posicao");
    if (error) return falha(error.message);
    return resposta({
      modulos: "Social (Stories, Seeding); Tarefas (Quadros, Meu trabalho, Calendário, Meu dia); Estratégia (Ata mensal, cronograma de e-mails); Biblioteca (Produtos, Medidas, Conferência, Cores, Textos, Arquivos, Editor de Estampas, Cores de estampa, Referências visuais).",
      vocabulario: "Estampa tem grupos e papéis de cor; receita = grupo + cor de camiseta; combo = cor de camiseta + cores de estampa, código CB+número; seeding trabalha por remessa = mês + motivo.",
      contagens: {
        quadros_ativos: quadros?.length ?? 0,
        cards_nao_arquivados: await c("tarefa_cards", (q) => q.eq("arquivado", false)),
        estampas: await c("biblioteca_estampas"),
        combos: await c("biblioteca_combos"),
        pessoas: await c("profiles"),
      },
      quadros: quadros ?? [],
    });
  },
});
