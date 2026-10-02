create table if not exists public.biblioteca_estampa_categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  posicao integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists biblioteca_estampa_categorias_nome_uk
  on public.biblioteca_estampa_categorias (lower(nome));

create table if not exists public.biblioteca_estampas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria_id uuid references public.biblioteca_estampa_categorias(id) on delete set null,
  imagem_caminho text,
  ficha_caminho text,
  tamanho_adulto text not null default '',
  tamanho_feminino text not null default '',
  tamanho_infantil text not null default '',
  situacao text not null default 'ativo',
  posicao integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.biblioteca_estampas drop constraint if exists biblioteca_estampas_situacao_ck;
alter table public.biblioteca_estampas add constraint biblioteca_estampas_situacao_ck
  check (situacao in ('ativo','descontinuado'));
create unique index if not exists biblioteca_estampas_nome_uk
  on public.biblioteca_estampas (lower(nome));

create table if not exists public.biblioteca_estampa_papeis (
  id uuid primary key default gen_random_uuid(),
  estampa_id uuid not null references public.biblioteca_estampas(id) on delete cascade,
  ordem integer not null,
  nome text not null default '',
  unique (estampa_id, ordem)
);

create table if not exists public.biblioteca_estampa_grupos (
  id uuid primary key default gen_random_uuid(),
  estampa_id uuid not null references public.biblioteca_estampas(id) on delete cascade,
  nome text not null default 'Grupo',
  posicao integer not null default 0
);

create table if not exists public.biblioteca_estampa_grupo_modelos (
  estampa_id uuid not null references public.biblioteca_estampas(id) on delete cascade,
  grupo_id uuid not null references public.biblioteca_estampa_grupos(id) on delete cascade,
  produto_id uuid not null references public.biblioteca_produtos(id) on delete cascade,
  primary key (grupo_id, produto_id)
);
create unique index if not exists biblioteca_estampa_modelo_unico
  on public.biblioteca_estampa_grupo_modelos (estampa_id, produto_id);

create table if not exists public.biblioteca_estampa_cores_camiseta (
  estampa_id uuid not null references public.biblioteca_estampas(id) on delete cascade,
  cor_id uuid not null references public.biblioteca_cores(id) on delete cascade,
  posicao integer not null default 0,
  primary key (estampa_id, cor_id)
);

create table if not exists public.biblioteca_combos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  genero text not null,
  cor_id uuid references public.biblioteca_cores(id) on delete set null,
  posicao integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.biblioteca_combos drop constraint if exists biblioteca_combos_genero_ck;
alter table public.biblioteca_combos add constraint biblioteca_combos_genero_ck
  check (genero in ('masculino','feminino','unissex','infantil'));
create unique index if not exists biblioteca_combos_codigo_uk
  on public.biblioteca_combos (upper(codigo));

create table if not exists public.biblioteca_combo_itens (
  combo_id uuid not null references public.biblioteca_combos(id) on delete cascade,
  ordem integer not null,
  codigo text not null,
  c integer not null default 0,
  m integer not null default 0,
  y integer not null default 0,
  k integer not null default 0,
  primary key (combo_id, ordem)
);

create table if not exists public.biblioteca_estampa_receitas (
  id uuid primary key default gen_random_uuid(),
  estampa_id uuid not null references public.biblioteca_estampas(id) on delete cascade,
  grupo_id uuid not null references public.biblioteca_estampa_grupos(id) on delete cascade,
  cor_id uuid not null references public.biblioteca_cores(id) on delete cascade,
  combo_id uuid references public.biblioteca_combos(id) on delete set null,
  unique (grupo_id, cor_id)
);

create table if not exists public.biblioteca_estampa_receita_itens (
  receita_id uuid not null references public.biblioteca_estampa_receitas(id) on delete cascade,
  ordem integer not null,
  codigo text not null,
  c integer not null default 0,
  m integer not null default 0,
  y integer not null default 0,
  k integer not null default 0,
  primary key (receita_id, ordem)
);

create or replace function public.biblioteca_estampas_touch()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists biblioteca_estampas_touch on public.biblioteca_estampas;
create trigger biblioteca_estampas_touch
  before update on public.biblioteca_estampas
  for each row execute function public.biblioteca_estampas_touch();

do $$
declare t text;
begin
  foreach t in array array['biblioteca_estampa_categorias','biblioteca_estampas','biblioteca_estampa_papeis','biblioteca_estampa_grupos','biblioteca_estampa_grupo_modelos','biblioteca_estampa_cores_camiseta','biblioteca_combos','biblioteca_combo_itens','biblioteca_estampa_receitas','biblioteca_estampa_receita_itens'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_sel', t);
    execute format('drop policy if exists %I on public.%I', t || '_ins', t);
    execute format('drop policy if exists %I on public.%I', t || '_upd', t);
    execute format('drop policy if exists %I on public.%I', t || '_del', t);
    execute format($p$create policy %I on public.%I for select to authenticated
      using (public.has_permission('biblioteca.catalogo_estampas'))$p$, t || '_sel', t);
    execute format($p$create policy %I on public.%I for insert to authenticated
      with check (public.can_edit('biblioteca.catalogo_estampas'))$p$, t || '_ins', t);
    execute format($p$create policy %I on public.%I for update to authenticated
      using (public.can_edit('biblioteca.catalogo_estampas'))
      with check (public.can_edit('biblioteca.catalogo_estampas'))$p$, t || '_upd', t);
    execute format($p$create policy %I on public.%I for delete to authenticated
      using (public.can_edit('biblioteca.catalogo_estampas'))$p$, t || '_del', t);
  end loop;
end $$;

create or replace function public.biblioteca_proximo_codigo_combo()
returns text language sql stable security definer set search_path = public as $$
  select 'CB' || (coalesce(max(nullif(regexp_replace(codigo, '\D', '', 'g'), '')::int), 0) + 1)::text
  from public.biblioteca_combos
$$;

create or replace function public.biblioteca_combo_registrar(
  p_genero text, p_cor_id uuid, p_itens jsonb
) returns table (id uuid, codigo text, criado boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_assinatura text;
  v_id uuid;
  v_codigo text;
begin
  if not public.can_edit('biblioteca.catalogo_estampas') then
    raise exception 'sem permissão';
  end if;

  select string_agg(upper(x->>'codigo'), '|' order by ord)
    into v_assinatura
    from jsonb_array_elements(p_itens) with ordinality as t(x, ord);

  select cb.id, cb.codigo into v_id, v_codigo
    from public.biblioteca_combos cb
   where cb.genero = p_genero
     and cb.cor_id is not distinct from p_cor_id
     and (
       select string_agg(upper(ci.codigo), '|' order by ci.ordem)
         from public.biblioteca_combo_itens ci
        where ci.combo_id = cb.id
     ) = v_assinatura
   limit 1;

  if v_id is not null then
    return query select v_id, v_codigo, false;
    return;
  end if;

  v_codigo := public.biblioteca_proximo_codigo_combo();
  insert into public.biblioteca_combos as nb (codigo, genero, cor_id, posicao)
  values (v_codigo, p_genero, p_cor_id,
          coalesce((select max(b2.posicao) from public.biblioteca_combos b2), 0) + 1)
  returning nb.id into v_id;

  insert into public.biblioteca_combo_itens (combo_id, ordem, codigo, c, m, y, k)
  select v_id, t.ord, t.x->>'codigo',
         coalesce((t.x->>'c')::int, 0), coalesce((t.x->>'m')::int, 0),
         coalesce((t.x->>'y')::int, 0), coalesce((t.x->>'k')::int, 0)
    from jsonb_array_elements(p_itens) with ordinality as t(x, ord);

  return query select v_id, v_codigo, true;
end;
$$;

create or replace function public.biblioteca_estampa_salvar_receita(
  p_estampa_id uuid, p_grupo_id uuid, p_cor_id uuid, p_combo_id uuid, p_itens jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.can_edit('biblioteca.catalogo_estampas') then
    raise exception 'sem permissão';
  end if;

  insert into public.biblioteca_estampa_receitas (estampa_id, grupo_id, cor_id, combo_id)
  values (p_estampa_id, p_grupo_id, p_cor_id, p_combo_id)
  on conflict (grupo_id, cor_id)
    do update set combo_id = excluded.combo_id
  returning id into v_id;

  delete from public.biblioteca_estampa_receita_itens where receita_id = v_id;

  insert into public.biblioteca_estampa_receita_itens (receita_id, ordem, codigo, c, m, y, k)
  select v_id, ord, x->>'codigo',
         coalesce((x->>'c')::int, 0), coalesce((x->>'m')::int, 0),
         coalesce((x->>'y')::int, 0), coalesce((x->>'k')::int, 0)
    from jsonb_array_elements(p_itens) with ordinality as t(x, ord);

  return v_id;
end;
$$;

create or replace function public.biblioteca_combo_uso()
returns table (combo_id uuid, total bigint, estampas text[])
language sql stable security definer set search_path = public as $$
  select r.combo_id, count(distinct r.estampa_id),
         array_agg(distinct e.nome order by e.nome)
    from public.biblioteca_estampa_receitas r
    join public.biblioteca_estampas e on e.id = r.estampa_id
   where r.combo_id is not null
     and public.has_permission('biblioteca.catalogo_estampas')
   group by r.combo_id
$$;

revoke execute on function public.biblioteca_combo_registrar(text, uuid, jsonb) from public, anon;
revoke execute on function public.biblioteca_estampa_salvar_receita(uuid, uuid, uuid, uuid, jsonb) from public, anon;
revoke execute on function public.biblioteca_combo_uso() from public, anon;
revoke execute on function public.biblioteca_proximo_codigo_combo() from public, anon;
grant execute on function public.biblioteca_combo_registrar(text, uuid, jsonb) to authenticated, service_role;
grant execute on function public.biblioteca_estampa_salvar_receita(uuid, uuid, uuid, uuid, jsonb) to authenticated, service_role;
grant execute on function public.biblioteca_combo_uso() to authenticated, service_role;
grant execute on function public.biblioteca_proximo_codigo_combo() to authenticated, service_role;

drop policy if exists "estampas pasta leitura" on storage.objects;
create policy "estampas pasta leitura" on storage.objects for select to authenticated
  using (bucket_id = 'marca' and (storage.foldername(name))[1] = 'estampas' and public.has_permission('biblioteca.catalogo_estampas'));
drop policy if exists "estampas pasta envio" on storage.objects;
create policy "estampas pasta envio" on storage.objects for insert to authenticated
  with check (bucket_id = 'marca' and (storage.foldername(name))[1] = 'estampas' and public.can_edit('biblioteca.catalogo_estampas'));
drop policy if exists "estampas pasta atualizacao" on storage.objects;
create policy "estampas pasta atualizacao" on storage.objects for update to authenticated
  using (bucket_id = 'marca' and (storage.foldername(name))[1] = 'estampas' and public.can_edit('biblioteca.catalogo_estampas'));
drop policy if exists "estampas pasta remocao" on storage.objects;
create policy "estampas pasta remocao" on storage.objects for delete to authenticated
  using (bucket_id = 'marca' and (storage.foldername(name))[1] = 'estampas' and public.can_edit('biblioteca.catalogo_estampas'));