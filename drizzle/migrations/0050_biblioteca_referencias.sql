create table if not exists public.biblioteca_referencia_grupos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  posicao integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.biblioteca_referencias (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.biblioteca_referencia_grupos(id) on delete cascade,
  nome text not null default '',
  caminho text not null,
  formato text not null default 'webp',
  largura integer not null default 0,
  altura integer not null default 0,
  tamanho_bytes integer not null default 0,
  posicao integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_biblioteca_referencias_grupo
  on public.biblioteca_referencias (grupo_id, posicao);

grant select, insert, update, delete on public.biblioteca_referencia_grupos, public.biblioteca_referencias to authenticated;
grant all on public.biblioteca_referencia_grupos, public.biblioteca_referencias to service_role;

alter table public.biblioteca_referencia_grupos enable row level security;
alter table public.biblioteca_referencias enable row level security;

do $$
declare
  par record;
  p record;
  comando text;
begin
  for par in
    select * from (values
      ('biblioteca_arquivo_grupos', 'biblioteca_referencia_grupos'),
      ('biblioteca_arquivos',       'biblioteca_referencias')
    ) as t(origem, destino)
  loop
    for p in
      select policyname, permissive, roles, cmd as acao, qual, with_check
        from pg_policies
       where schemaname = 'public' and tablename = par.origem
    loop
      execute format('drop policy if exists %I on public.%I', p.policyname, par.destino);
      comando := format(
        'create policy %I on public.%I as %s for %s to %s',
        p.policyname, par.destino,
        case when p.permissive = 'PERMISSIVE' then 'permissive' else 'restrictive' end,
        p.acao,
        array_to_string(p.roles, ',')
      );
      if p.qual is not null then
        comando := comando || format(' using (%s)', p.qual);
      end if;
      if p.with_check is not null then
        comando := comando || format(' with check (%s)', p.with_check);
      end if;
      execute comando;
    end loop;
  end loop;
end $$;

do $$
declare
  p record;
  comando text;
  novo_nome text;
begin
  for p in
    select policyname, permissive, roles, cmd as acao, qual, with_check
      from pg_policies
     where schemaname = 'storage'
       and tablename = 'objects'
       and (coalesce(qual, '') like '%''marca''%' or coalesce(with_check, '') like '%''marca''%')
  loop
    novo_nome := left(p.policyname || ' referencias', 60);
    execute format('drop policy if exists %I on storage.objects', novo_nome);
    comando := format(
      'create policy %I on storage.objects as %s for %s to %s',
      novo_nome,
      case when p.permissive = 'PERMISSIVE' then 'permissive' else 'restrictive' end,
      p.acao,
      array_to_string(p.roles, ',')
    );
    if p.qual is not null then
      comando := comando || format(' using (%s)', replace(p.qual, '''marca''', '''referencias'''));
    end if;
    if p.with_check is not null then
      comando := comando || format(' with check (%s)', replace(p.with_check, '''marca''', '''referencias'''));
    end if;
    execute comando;
  end loop;
end $$;

create or replace function public.biblioteca_referencias_reordenar(p_itens jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.biblioteca_referencias r
     set grupo_id = (e.item->>'grupo_id')::uuid,
         posicao  = (e.item->>'posicao')::int
    from jsonb_array_elements(p_itens) as e(item)
   where r.id = (e.item->>'id')::uuid;
end $$;

grant execute on function public.biblioteca_referencias_reordenar(jsonb) to authenticated;