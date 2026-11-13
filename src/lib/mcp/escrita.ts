import type { ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

type SB = ReturnType<typeof import("./supabase").supabaseForUser>;
export const UUID = /^[0-9a-f-]{36}$/i;
export const PRIORIDADE = z.enum(["baixa", "media", "alta", "maxima"]);
export const DATA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use AAAA-MM-DD.");

export class Erro extends Error {}

const norm = (s: string) => s.trim().toLowerCase();

export async function nomeUsuario(sb: SB, ctx: ToolContext) {
  const { data } = await sb.from("profiles").select("nome").eq("id", ctx.getUserId()!).maybeSingle();
  return data?.nome ?? ctx.getUserEmail() ?? "usuário";
}

export async function exigirEdicao(sb: SB, quadroId: string) {
  const { data, error } = await sb.rpc("pode_editar_quadro", { _quadro_id: quadroId });
  if (error) throw new Erro(error.message);
  if (!data) throw new Erro("Você não tem permissão para editar este quadro.");
}

export async function acharResponsavel(sb: SB, valor: string) {
  const { data } = await sb.from("profiles").select("id, nome").order("nome");
  const lista = data ?? [];
  const p = lista.find((x) => x.id === valor || norm(x.nome) === norm(valor));
  if (!p) throw new Erro(`Responsável "${valor}" não existe. Existentes: ${lista.map((x) => x.nome).join(", ")}.`);
  return p.id;
}

export async function acharEtiquetas(sb: SB, quadroId: string, nomes: string[]) {
  const { data } = await sb.from("tarefa_etiquetas").select("id, nome, quadro_id").eq("arquivado", false).or(`quadro_id.is.null,quadro_id.eq.${quadroId}`).order("posicao");
  const lista = data ?? [];
  const faltando: string[] = [];
  const ids = nomes.map((n) => {
    const e = lista.find((x) => x.id === n || norm(x.nome) === norm(n));
    if (!e) faltando.push(n);
    return e?.id;
  });
  if (faltando.length) throw new Erro(`Etiqueta(s) inexistente(s): ${faltando.join(", ")}. Existentes neste quadro: ${lista.map((x) => x.nome).join(", ")}.`);
  return [...new Set(ids as string[])];
}

export async function adicionarChecklist(sb: SB, cardId: string, itens: string[]) {
  const limpos = itens.map((t) => t.trim()).filter(Boolean);
  if (!limpos.length) return;
  const { data } = await sb.from("tarefa_checklist").select("posicao").eq("card_id", cardId).order("posicao", { ascending: false }).limit(1);
  let pos = (data?.[0]?.posicao ?? -1) + 1;
  const { error } = await sb.from("tarefa_checklist").insert(limpos.map((texto) => ({ card_id: cardId, texto, posicao: pos++ })));
  if (error) throw new Erro(`Checklist: ${error.message}`);
}

export async function registrarHistorico(sb: SB, ctx: ToolContext, cardId: string, acao: string, detalhe: string) {
  const nome = await nomeUsuario(sb, ctx);
  const { error } = await sb.from("tarefa_historico").insert({ card_id: cardId, autor_id: ctx.getUserId()!, acao, detalhe: `Via Claude (MCP), por ${nome}. ${detalhe}`.trim() });
  if (error) throw new Erro(`Histórico: ${error.message}`);
}

export async function adicionarDependencias(sb: SB, cardId: string, refs: string[], ctx: ToolContext) {
  const ids: string[] = [];
  const nomes: string[] = [];
  for (const r of refs.map((x) => x.trim()).filter(Boolean)) {
    const { data } = await (UUID.test(r) ? sb.from("tarefa_cards").select("id, titulo").eq("id", r) : sb.from("tarefa_cards").select("id, titulo").eq("titulo", r)).limit(20);
    if (!data?.length) throw new Erro(`Card de dependência "${r}" não encontrado ou sem acesso.`);
    if (data.length > 1) throw new Erro(`Vários cards com o título "${r}"; use o id: ${data.map((c) => c.id).join(", ")}.`);
    if (data[0]!.id === cardId) throw new Erro("Um card não pode depender dele mesmo.");
    ids.push(data[0]!.id); nomes.push(data[0]!.titulo);
  }
  const unicos = [...new Set(ids)];
  if (!unicos.length) return [];
  const { error } = await sb.from("tarefa_card_dependencias").upsert(unicos.map((depende_de_id) => ({ card_id: cardId, depende_de_id, criado_por: ctx.getUserId()! })), { onConflict: "card_id,depende_de_id", ignoreDuplicates: true });
  if (error) throw new Erro(`Dependências: ${error.message}`);
  return nomes;
}
