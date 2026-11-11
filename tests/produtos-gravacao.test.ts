import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const db = new PGlite();
beforeAll(async () => {
  await db.exec(`
    create role authenticated; create role anon; create role service_role;
    create table public.biblioteca_produtos (id uuid primary key, xtra_modelo boolean, nome_base text);
    create table public.biblioteca_produto_cores (produto_id uuid, cor_id uuid, categoria text, primary key(produto_id, cor_id));
    grant select, insert, update on public.biblioteca_produtos to authenticated;
    grant select, insert, update, delete on public.biblioteca_produto_cores to authenticated;
    alter table public.biblioteca_produtos enable row level security;
    alter table public.biblioteca_produto_cores enable row level security;
    create function public.can_edit(p text) returns boolean language sql as $$ select current_setting('test.permission', true) = p $$;
    create policy biblioteca_produtos_select on public.biblioteca_produtos for select to authenticated using (true);
    create policy biblioteca_produtos_update on public.biblioteca_produtos for update to authenticated using (false);
    create policy biblioteca_produtos_insert on public.biblioteca_produtos for insert to authenticated with check (false);
    create policy biblioteca_produto_cores_select on public.biblioteca_produto_cores for select to authenticated using (true);
    create policy biblioteca_produto_cores_insert on public.biblioteca_produto_cores for insert to authenticated with check (false);
    create policy biblioteca_produto_cores_update on public.biblioteca_produto_cores for update to authenticated using (false);
    create policy biblioteca_produto_cores_delete on public.biblioteca_produto_cores for delete to authenticated using (false);
    insert into public.biblioteca_produtos values ('11111111-1111-1111-1111-111111111111', true, 'Original');
  `);
  await db.exec(readFileSync(new URL('../drizzle/migrations/0063_produtos_edicao_por_permissao.sql', import.meta.url), 'utf8'));
});
afterAll(() => db.close());

describe('gravação autorizada de Produtos', () => {
  test('edição de Produtos permite desabilitar XTRA no MODELO e editar nome', async () => {
    await db.exec("set role authenticated; set test.permission = 'biblioteca.produtos';");
    const { rows } = await db.query("update public.biblioteca_produtos set xtra_modelo=false, nome_base='Alterado' returning xtra_modelo, nome_base");
    expect(rows).toEqual([{ xtra_modelo: false, nome_base: 'Alterado' }]);
  });
  test('somente leitura não pode gravar XTRA', async () => {
    await db.exec("set role authenticated; set test.permission = 'biblioteca.produtos:leitura';");
    const { rows } = await db.query("update public.biblioteca_produtos set xtra_modelo=true returning id");
    expect(rows).toEqual([]);
    const result = await db.query('select xtra_modelo from public.biblioteca_produtos');
    expect(result.rows).toEqual([{ xtra_modelo: false }]);
  });
  test('edição de Produtos permite gravar cores pela ficha', async () => {
    await db.exec("set test.permission = 'biblioteca.produtos';");
    await db.query(`select public.biblioteca_salvar_cores('11111111-1111-1111-1111-111111111111', '[{"cor_id":"22222222-2222-2222-2222-222222222222","categoria":"Normal"}]')`);
    expect((await db.query('select categoria from public.biblioteca_produto_cores')).rows).toEqual([{ categoria: 'Normal' }]);
  });
  test('somente leitura não pode alterar cores pela ficha', async () => {
    await db.exec("set test.permission = 'biblioteca.produtos:leitura';");
    await expect(db.query(`select public.biblioteca_salvar_cores('11111111-1111-1111-1111-111111111111', '[]')`)).rejects.toThrow('sem permissao');
  });
});