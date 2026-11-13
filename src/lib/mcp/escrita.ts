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

export async function acharCard(sb: SB, ref: string, rotulo = "Card") {
  const r = ref.trim();
  const { data } = await (UUID.test(r) ? sb.from("tarefa_cards").select("id, titulo, quadro_id, coluna_id, posicao, arquivado").eq("id", r) : sb.from("tarefa_cards").select("id, titulo, quadro_id, coluna_id, posicao, arquivado").eq("titulo", r)).limit(20);
  if (!data?.length) throw new Erro(`${rotulo} "${r}" não encontrado ou sem acesso.`);
  if (data.length > 1) throw new Erro(`Vários cards com o título "${r}"; use o id: ${data.map((c) => c.id).join(", ")}.`);
  return data[0]!;
}

export async function resolverDependencias(sb: SB, cardId: string, refs: string[]) {
  const achados: { id: string; titulo: string }[] = [];
  for (const r of refs.map((x) => x.trim()).filter(Boolean)) {
    const c = await acharCard(sb, r, "Card de dependência");
    if (c.id === cardId) throw new Erro("Um card não pode depender dele mesmo.");
    if (!achados.some((x) => x.id === c.id)) achados.push({ id: c.id, titulo: c.titulo });
  }
  return achados;
}

export async function gravarDependencias(sb: SB, cardId: string, deps: { id: string }[], ctx: ToolContext) {
  if (!deps.length) return;
  const { error } = await sb.from("tarefa_card_dependencias").upsert(deps.map((d) => ({ card_id: cardId, depende_de_id: d.id, criado_por: ctx.getUserId()! })), { onConflict: "card_id,depende_de_id", ignoreDuplicates: true });
  if (error) throw new Erro(`Dependências: ${error.message}`);
}

export async function adicionarDependencias(sb: SB, cardId: string, refs: string[], ctx: ToolContext) {
  const deps = await resolverDependencias(sb, cardId, refs);
  await gravarDependencias(sb, cardId, deps, ctx);
  return deps.map((d) => d.titulo);
}

export async function acharMembros(sb: SB, valores: string[]) {
  const ids: string[] = [];
  for (const v of valores) { const id = await acharResponsavel(sb, v); if (!ids.includes(id)) ids.push(id); }
  return ids;
}

type ItemCk = { id: string; texto: string; feito: boolean };
async function lerChecklist(sb: SB, cardId: string): Promise<ItemCk[]> {
  const { data, error } = await sb.from("tarefa_checklist").select("id, texto, feito").eq("card_id", cardId).order("posicao").order("created_at");
  if (error) throw new Erro(`Checklist: ${error.message}`);
  return data ?? [];
}
function acharItem(lista: ItemCk[], ref: string | number): ItemCk {
  const it = typeof ref === "number" ? lista[ref - 1] : lista.find((x) => x.id === ref) ?? (/^\d+$/.test(ref) ? lista[Number(ref) - 1] : undefined);
  if (!it) throw new Erro(`Item de checklist "${ref}" não encontrado. Use o id ou a posição (1 a ${lista.length}) de card_detalhe.`);
  return it;
}
async function gravarOrdem(sb: SB, ids: string[]) {
  for (const [posicao, id] of ids.entries()) {
    const { error } = await sb.from("tarefa_checklist").update({ posicao }).eq("id", id);
    if (error) throw new Erro(`Checklist: ${error.message}`);
  }
}

type Ref = string | number;
export type OpsChecklist = {
  substituir?: string[] | undefined;
  editar?: { item: Ref; texto?: string | undefined; feito?: boolean | undefined }[] | undefined;
  marcar?: { item: Ref; feito: boolean }[] | undefined;
  remover?: Ref[] | undefined;
  ordem?: Ref[] | undefined;
  adicionar?: string[] | undefined;
};

/** Valida tudo (itens precisam ser do card) sem gravar; devolve a gravação e as descrições para o histórico. Posições referem-se à lista antes da chamada. */
export async function prepararChecklist(sb: SB, cardId: string, op: OpsChecklist): Promise<{ gravar: () => Promise<void>; desc: string[] }> {
  const desc: string[] = [];
  const passos: (() => Promise<void>)[] = [];
  const falhaCk = (e: { message: string } | null) => { if (e) throw new Erro(`Checklist: ${e.message}`); };
  if (op.substituir) {
    if (op.editar?.length || op.marcar?.length || op.remover?.length || op.ordem?.length) throw new Erro("substituir_checklist não pode ser combinado com editar/marcar/remover/reordenar.");
    const lista = await lerChecklist(sb, cardId);
    const novos = op.substituir;
    passos.push(async () => { const { error } = await sb.from("tarefa_checklist").delete().eq("card_id", cardId); falhaCk(error); await adicionarChecklist(sb, cardId, novos); });
    desc.push(`checklist substituído (${novos.filter((t) => t.trim()).length} itens; apagados: ${lista.map((x) => `"${x.texto}"`).join(", ") || "nenhum"})`);
  } else if (op.editar?.length || op.marcar?.length || op.remover?.length || op.ordem?.length) {
    const lista = await lerChecklist(sb, cardId);
    const textos = new Map<string, string>();
    const feitos = new Map<string, boolean>();
    for (const e of op.editar ?? []) {
      const it = acharItem(lista, e.item);
      if (e.texto !== undefined) textos.set(it.id, e.texto.trim());
      if (e.feito !== undefined) feitos.set(it.id, e.feito);
    }
    for (const m of op.marcar ?? []) feitos.set(acharItem(lista, m.item).id, m.feito);
    const remover = new Set((op.remover ?? []).map((r) => acharItem(lista, r).id));
    for (const [id, t] of textos) if (!t) remover.add(id);
    const restantes = lista.filter((x) => !remover.has(x.id)).map((x) => x.id);
    let ordem: string[] | null = null;
    if (op.ordem?.length) {
      ordem = op.ordem.map((r) => acharItem(lista, r).id);
      if (new Set(ordem).size !== ordem.length || ordem.length !== restantes.length || ordem.some((id) => !restantes.includes(id)))
        throw new Erro(`reordenar_checklist precisa listar todos os ${restantes.length} itens restantes, cada um uma vez.`);
    }
    const nome = (id: string) => `"${lista.find((x) => x.id === id)!.texto}"`;
    const eds = [...textos].filter(([id, t]) => t && !remover.has(id) && t !== lista.find((x) => x.id === id)!.texto);
    const mks = [...feitos].filter(([id]) => !remover.has(id));
    for (const [id, texto] of eds) passos.push(async () => { const { error } = await sb.from("tarefa_checklist").update({ texto }).eq("id", id).eq("card_id", cardId); falhaCk(error); });
    for (const [id, feito] of mks) passos.push(async () => { const { error } = await sb.from("tarefa_checklist").update({ feito }).eq("id", id).eq("card_id", cardId); falhaCk(error); });
    if (remover.size) passos.push(async () => { const { error } = await sb.from("tarefa_checklist").delete().eq("card_id", cardId).in("id", [...remover]); falhaCk(error); });
    if (ordem || remover.size) { const ids = ordem ?? restantes; passos.push(() => gravarOrdem(sb, ids)); }
    if (eds.length) desc.push(`checklist editado (${eds.map(([id, t]) => `${nome(id)} → "${t}"`).join(", ")})`);
    if (mks.length) desc.push(`checklist marcado (${mks.map(([id, f]) => `${nome(id)} ${f ? "feito" : "não feito"}`).join(", ")})`);
    if (remover.size) desc.push(`checklist apagado (${[...remover].map(nome).join(", ")})`);
    if (ordem) desc.push("checklist reordenado");
  }
  if (op.adicionar?.length) { const ad = op.adicionar; passos.push(() => adicionarChecklist(sb, cardId, ad)); desc.push(`checklist adicionado (${ad.filter((t) => t.trim()).map((t) => `"${t.trim()}"`).join(", ")})`); }
  return { desc, gravar: async () => { for (const p of passos) await p(); } };
}

export async function acharQuadro(sb: SB, ref: string) {
  const r = ref.trim();
  const { data } = await (UUID.test(r) ? sb.from("tarefa_quadros").select("id, nome").eq("id", r) : sb.from("tarefa_quadros").select("id, nome").ilike("nome", r)).eq("arquivado", false);
  if (!data?.length) throw new Erro(`Quadro "${r}" não encontrado ou sem acesso.`);
  if (data.length > 1) throw new Erro("Mais de um quadro com esse nome; use o id.");
  return data[0]!;
}

export async function acharColuna(sb: SB, quadro: { id: string; nome: string }, ref: string) {
  const { data: cols } = await sb.from("tarefa_colunas").select("id, nome").eq("quadro_id", quadro.id).eq("arquivado", false).order("posicao");
  const col = (cols ?? []).find((c) => c.id === ref.trim() || norm(c.nome) === norm(ref));
  if (!col) throw new Erro(`Coluna "${ref}" não existe em ${quadro.nome}. Colunas: ${(cols ?? []).map((c) => c.nome).join(", ")}.`);
  return col;
}

export async function idsDaColuna(sb: SB, colunaId: string) {
  const { data, error } = await sb.from("tarefa_cards").select("id, titulo").eq("coluna_id", colunaId).eq("arquivado", false).order("posicao").order("created_at");
  if (error) throw new Erro(error.message);
  return data ?? [];
}

export async function gravarOrdemColuna(sb: SB, colunaId: string, ids: string[]) {
  if (!ids.length) return;
  const { error } = await sb.rpc("tarefa_reordenar_cards", { _coluna_id: colunaId, _ids: ids });
  if (error) throw new Erro(error.message);
}
