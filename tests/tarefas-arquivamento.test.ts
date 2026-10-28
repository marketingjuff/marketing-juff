import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { ARQUIVADOS_POR_PAGINA, podeArquivarCard } from "../src/lib/tarefas";

const db = new PGlite();

beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated;
    create table public.tarefa_cards (
      id uuid primary key, quadro_id uuid, coluna_id uuid,
      arquivado boolean default false, concluido boolean default false,
      concluido_em timestamptz, updated_at timestamptz not null default now()
    );
    create table public.tarefa_historico (card_id uuid, autor_id uuid, acao text, detalhe text);
  `);
  await db.exec(readFileSync(new URL("../drizzle/migrations/0059_tarefas_arquivamento.sql", import.meta.url), "utf8"));
});
afterAll(() => db.close());

async function fixture(overrides: string) {
  const id = crypto.randomUUID();
  await db.exec(`insert into public.tarefa_cards (id, quadro_id, coluna_id) values ('${id}', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');`);
  await db.exec(`update public.tarefa_cards set ${overrides} where id = '${id}'`);
  return id;
}
async function archived(id: string) {
  return (await db.query<{ arquivado: boolean }>("select arquivado from public.tarefa_cards where id = $1", [id])).rows[0]?.arquivado;
}

describe("arquivamento automático", () => {
  test("arquiva concluído sem alteração há mais de 30 dias, uma vez só", async () => {
    const id = await fixture("concluido = true, concluido_em = now() - interval '31 days', updated_at = now() - interval '31 days'");
    await db.query("select public.tarefa_arquivar_concluidos()");
    expect(await archived(id)).toBe(true);
    await db.query("select public.tarefa_arquivar_concluidos()");
    const { rows } = await db.query<{ total: number }>("select count(*)::int as total from public.tarefa_historico where card_id = $1", [id]);
    expect(rows[0]?.total).toBe(1);
  });
  test("uma alteração recente impede arquivamento mesmo com conclusão antiga", async () => {
    const id = await fixture("concluido = true, concluido_em = now() - interval '60 days', updated_at = now() - interval '29 days'");
    await db.query("select public.tarefa_arquivar_concluidos()");
    expect(await archived(id)).toBe(false);
  });
  test("card aberto não é arquivado após 31 dias", async () => {
    const id = await fixture("concluido = false, updated_at = now() - interval '31 days'");
    await db.query("select public.tarefa_arquivar_concluidos()");
    expect(await archived(id)).toBe(false);
  });
  test("conclusão sem data não entra na varredura", async () => {
    const id = await fixture("concluido = true, concluido_em = null, updated_at = now() - interval '31 days'");
    await db.query("select public.tarefa_arquivar_concluidos()");
    expect(await archived(id)).toBe(false);
  });
  test("restauração limpa a data sem mudar quadro ou coluna", async () => {
    const id = await fixture("arquivado = true");
    const stamp = await db.query<{ arquivado_em: Date | null }>("select arquivado_em from public.tarefa_cards where id = $1", [id]);
    expect(stamp.rows[0]?.arquivado_em).not.toBeNull();
    await db.query("update public.tarefa_cards set arquivado = false where id = $1", [id]);
    const { rows } = await db.query("select arquivado, arquivado_em, quadro_id, coluna_id from public.tarefa_cards where id = $1", [id]);
    expect(rows[0]).toEqual({ arquivado: false, arquivado_em: null, quadro_id: "11111111-1111-1111-1111-111111111111", coluna_id: "22222222-2222-2222-2222-222222222222" });
  });
  test("consulta carrega lotes de 50 cards", () => {
    expect(ARQUIVADOS_POR_PAGINA).toBe(50);
  });
});

describe("arquivamento manual", () => {
  test("concluído em somente leitura ainda pode ser arquivado por quem edita o quadro", () => {
    expect(podeArquivarCard({ concluido: true }, { podeMexer: true, mexer: false })).toBe(true);
  });
  test("card aberto segue podendo ser arquivado por quem edita", () => {
    expect(podeArquivarCard({ concluido: false }, { podeMexer: true, mexer: true })).toBe(true);
  });
  test("quem não edita o quadro não arquiva, concluído ou não", () => {
    expect(podeArquivarCard({ concluido: true }, { podeMexer: false, mexer: false })).toBe(false);
    expect(podeArquivarCard({ concluido: false }, { podeMexer: false, mexer: false })).toBe(false);
  });
  test("arquivar um concluído não o reabre e registra a data", async () => {
    const id = await fixture("concluido = true, concluido_em = now() - interval '5 days'");
    await db.query("update public.tarefa_cards set arquivado = true where id = $1", [id]);
    const { rows } = await db.query<{ arquivado: boolean; concluido: boolean; tem_data: boolean }>(
      "select arquivado, concluido, arquivado_em is not null as tem_data from public.tarefa_cards where id = $1",
      [id],
    );
    expect(rows[0]).toEqual({ arquivado: true, concluido: true, tem_data: true });
  });
});