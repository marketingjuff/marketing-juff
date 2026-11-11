import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, resposta, falha } from "../supabase";

const AREAS = {
  produtos: "biblioteca_produtos", medidas: "biblioteca_medidas", cores_camiseta: "biblioteca_cores", paleta: "biblioteca_paleta",
  textos: "biblioteca_textos", arquivos: "biblioteca_arquivos", estampas: "biblioteca_estampas", combos: "biblioteca_combos",
  combo_itens: "biblioteca_combo_itens", cores_estampa: "biblioteca_estampa_cores", receitas: "biblioteca_estampa_receitas",
  referencias: "biblioteca_referencias", atas: "estrategia_atas", ata_valores: "estrategia_valores", ata_campos: "estrategia_campos",
  decisoes: "estrategia_decisoes", emails: "estrategia_emails", email_tipos: "estrategia_email_tipos", email_regras: "estrategia_email_regras",
  stories: "stories", story_frames: "story_frames", seeding_remessas: "social_seeding_remessas", seeding_pecas: "social_seeding_pecas",
  seeding_custos: "social_seeding_custos", quadros: "tarefa_quadros", colunas: "tarefa_colunas", etiquetas: "tarefa_etiquetas", feriados: "feriados",
} as const;

export default defineTool({
  name: "dados_consultar",
  title: "Consultar dados",
  description: `Lê linhas de uma área do sistema (Biblioteca, Estratégia, Social, Tarefas), respeitando suas permissões. Áreas: ${Object.keys(AREAS).join(", ")}. Meu dia e dados pessoais ficam fora.`,
  inputSchema: {
    area: z.enum(Object.keys(AREAS) as [keyof typeof AREAS, ...(keyof typeof AREAS)[]]),
    filtros: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional().describe("Igualdade por coluna, ex. {\"mes\": 11}."),
    busca_coluna: z.string().optional().describe("Coluna de texto para busca parcial."),
    busca: z.string().optional(),
    limite: z.number().int().min(1).max(500).optional(),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (a, ctx) => {
    const sb = supabaseForUser(ctx);
    let q: any = sb.from(AREAS[a.area] as any).select("*").limit(a.limite ?? 100);
    for (const [k, v] of Object.entries(a.filtros ?? {})) q = q.eq(k, v);
    if (a.busca && a.busca_coluna) q = q.ilike(a.busca_coluna, `%${a.busca}%`);
    const { data, error } = await q;
    if (error) return falha(`O banco recusou: ${error.message}`);
    return resposta({ area: a.area, linhas: data?.length ?? 0, dados: data ?? [] });
  },
});
